/* Excel ve rapor dışa aktarma işlemleri yalnızca ihtiyaç anında yüklenir. */
(function attachReportExports(global) {
function calculateExcelColumnWidth(text, isNumber = false, isBold = false, options = {}) {
    const emptyWidth = options.emptyWidth ?? 10;
    const adjustment = options.adjustment ?? 2;
    if (!text && text !== 0) return emptyWidth;
    const strText = String(text);
    let baseWidth = strText.length;
    if (isNumber) baseWidth *= 1.2;
    if (isBold) baseWidth *= 1.15;
    return Math.max(10, Math.ceil(baseWidth) + adjustment);
}

async function exportSummaryExcel() {
    if (!currentPerson || !allData[currentPerson]) return;
    try {
        await ensureExcelLibs();
    } catch (err) {
        showNotification('❌ Excel kütüphanesi yüklenemedi', 'error');
        return;
    }

    const balances = allData[currentPerson].categoryBalances || {};
    const data = [];

    const borderStyle = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

    data.push([
        {
            v: "Kategori",
            s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "444444" } }, border: borderStyle, alignment: { horizontal: 'center' } }
        },
        {
            v: "Tutar (₺)",
            s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "444444" } }, border: borderStyle, alignment: { horizontal: 'center' } }
        },
        {
            v: "Durum",
            s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "444444" } }, border: borderStyle, alignment: { horizontal: 'center' } }
        }
    ]);

    let hasData = false;

    Object.keys(balances).sort().forEach(cat => {
        if (cat === 'BEN') return;
        const amount = balances[cat];
        if (Math.abs(amount) > 0.01) {
            hasData = true;

            let bgColor = "FFFFFF";
            let durum = "-";

            if(amount > 0.01) {
                bgColor = "FCE4D6";
                durum = "Borçlu";
            } else if(amount < -0.01) {
                bgColor = "E2EFDA";
                durum = "Alacaklı";
            }

            const cellStyle = {
                border: borderStyle,
                fill: { fgColor: { rgb: bgColor } },
                font: { color: { rgb: "000000" } }
            };

            const numStyle = {
                ...cellStyle,
                numFmt: "#,##0.00",
                alignment: { horizontal: 'right' }
            };

            data.push([
                { v: cat, s: { ...cellStyle, font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: 'left' } } },
                { v: Math.abs(amount), t: 'n', s: numStyle },
                { v: durum, s: { ...cellStyle, alignment: { horizontal: 'center' } } }
            ]);
        }
    });

    if (!hasData) return showNotification('⚠️ Bakiye verisi yok', 'warning');

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [{wch: 25}, {wch: 18}, {wch: 12}];

    XLSX.utils.book_append_sheet(wb, ws, "Ozet");
    XLSX.writeFile(wb, `${currentPerson}_Ozet_Durum.xlsx`);

    showNotification('✅ Excel İndirildi', 'success');
    const so = document.getElementById('shareOptions');
    if (so) so.classList.remove('share-options--visible');
}

function exportCurrentCategoryDetailToExcel() {
    const person = currentCategoryDetailState.person;
    const categoryName = currentCategoryDetailState.category;
    const transactions = currentCategoryDetailState.filteredTransactions || [];

    if (!person || !categoryName || transactions.length === 0) {
        showNotification('⚠️ Excel için işlem bulunamadı', 'warning');
        return;
    }

    showNotification('⚠️ Rapor hazırlanıyor...', 'warning');
    ensureExcelLibs()
        .then(function() {
            exportStyledCategoryDetailToExcel(person, categoryName, transactions, currentCategoryDetailState.openingBalance);
        })
        .catch(function() {
            showNotification('❌ Excel kütüphanesi yüklenemedi', 'error');
        });
}

function createCategorySummaryData(person, allTransactions, periodTransactions, startDateStr) {
    const cats = allData[person].categories.sort();
    const startDate = new Date(startDateStr);

    const data = [['Kategori', 'Devreden', 'Gelen TL', 'Giden TL', 'Kalan', 'Durum']];
    const activeCategories = [];

    cats.forEach(cat => {
        if(cat === 'BEN') return;

        let devreden = 0;
        allTransactions.forEach(t => {
            if (t.category === cat && new Date(t.date) < startDate) {
                if (t.type === 'giden') devreden += t.amount;
                else devreden -= t.amount;
            }
        });

        let periodGelen = 0;
        let periodGiden = 0;
        let hasPeriodActivity = false;

        periodTransactions.forEach(t => {
            if(t.category === cat) {
                hasPeriodActivity = true;
                if(t.type === 'giden') periodGiden += t.amount;
                else periodGelen += t.amount;
            }
        });

        if (Math.abs(devreden) > 0.01 || hasPeriodActivity) {
            const finalBalance = devreden + periodGiden - periodGelen;

            let status = finalBalance > 0.01 ? 'Borçlu' : (finalBalance < -0.01 ? 'Alacaklı' : '-');

            data.push([
                cat,
                devreden,
                periodGelen,
                periodGiden,
                Math.abs(finalBalance),
                status
            ]);
            activeCategories.push(cat);
        }
    });

    return { categoryData: data, activeCategories };
}

async function exportToExcel() {
    if (exportInProgress) return showNotification("⚠️ Rapor hazırlanıyor...", "warning");
    const person = currentPerson;
    if (!person) return showNotification(VALIDATION_MSG.selectPerson, 'error');

    exportInProgress = true;

    try {
        await ensureExcelLibs();
    } catch (err) {
        exportInProgress = false;
        return showNotification('❌ Excel kütüphanesi yüklenemedi', 'error');
    }

    const borderStyle = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const styles = {
        title: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "FFFFFF" } } },
        dateRange: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "FFFFFF" } } },
        header: { fill: { fgColor: { rgb: "BDD7EE" } }, font: { bold: true, color: { rgb: "000000" } }, border: borderStyle, alignment: { horizontal: 'center', vertical: 'center' } },
        rowGiden: { fill: { fgColor: { rgb: "FCE4D6" } }, border: borderStyle, alignment: { vertical: 'top', wrapText: true } },
        rowGelen: { fill: { fgColor: { rgb: "E2EFDA" } }, border: borderStyle, alignment: { vertical: 'top', wrapText: true } },
        cellNumber: { numFmt: "#,##0.00" },
        summaryHeader: { fill: { fgColor: { rgb: "444444" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, border: borderStyle, alignment: { horizontal: 'center' } }
    };

    try {
        const { allTransactions, periodTransactions } = getFilteredTransactions();

        const startDateVal = document.getElementById('startDate').value;
        const startDateDisplay = formatDateTR(new Date(startDateVal));
        const endDateDisplay = document.getElementById('endDate').value ? new Date(document.getElementById('endDate').value).toLocaleDateString('tr-TR') : 'Bugün';

        const dateRangeText = `${startDateDisplay} - ${endDateDisplay}`;

        if (periodTransactions.length === 0) {
             showNotification('⚠️ Seçilen aralıkta işlem yok.', 'warning');
        }

        const wb = XLSX.utils.book_new();

        const sortedTxs = [...periodTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        const titleText = `${person.toLocaleUpperCase('tr-TR')} - HESAP HAREKETLERİ`;

        const wsDataDetails = [
            [{ v: titleText, s: styles.title }, null, null, null, null],
            [{ v: dateRangeText, s: styles.dateRange }, null, null, null, null],
            [
                { v: "Tarih", s: styles.header },
                { v: "Gelen TL", s: styles.header },
                { v: "Giden TL", s: styles.header },
                { v: "Kalan TL", s: styles.header },
                { v: "Açıklama", s: styles.header }
            ]
        ];

        let colWidths = [12, 12, 12, 12, 50];

        let runningBalance = 0;
        allTransactions.forEach(t => {
            if (new Date(t.date) < new Date(startDateVal)) {
                 if (t.type === 'giden') runningBalance += t.amount;
                 else runningBalance -= t.amount;
            }
        });

        const devirRowStyle = { fill: { fgColor: { rgb: "BDD7EE" } }, border: borderStyle, font: { bold: true, italic: true } };
        wsDataDetails.push([
            { v: startDateDisplay, s: devirRowStyle },
            { v: "", s: devirRowStyle },
            { v: "", s: devirRowStyle },
            { v: runningBalance, t: 'n', s: { ...devirRowStyle, ...styles.cellNumber, alignment: { horizontal: 'right' } } },
            { v: "Önceki Aydan Devir", s: devirRowStyle }
        ]);

        sortedTxs.forEach(tx => {
            let amountNum = Number(tx.amount);
            if (tx.type === 'giden') runningBalance += amountNum;
            else runningBalance -= amountNum;

            let currentBalDisplay = Math.round(runningBalance * 100) / 100;
            const dateStr = formatDateTR(new Date(tx.date));
            let fullDescription = tx.category.toLocaleUpperCase('tr-TR');
            if (tx.description && tx.description.trim() !== "") fullDescription += " - " + tx.description;

            let rowStyleBase = tx.type === 'giden' ? styles.rowGiden : styles.rowGelen;

            if (tx.type === 'gelen') colWidths[1] = Math.max(colWidths[1], calculateExcelColumnWidth(amountNum, true));
            if (tx.type === 'giden') colWidths[2] = Math.max(colWidths[2], calculateExcelColumnWidth(amountNum, true));
            colWidths[3] = Math.max(colWidths[3], calculateExcelColumnWidth(currentBalDisplay, true));

            const row = [
                { v: dateStr, s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top' } } },
                { v: tx.type === 'gelen' ? amountNum : "", t: tx.type === 'gelen' ? 'n' : 's', s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } },
                { v: tx.type === 'giden' ? amountNum : "", t: tx.type === 'giden' ? 'n' : 's', s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } },
                { v: currentBalDisplay, t: 'n', s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } },
                { v: fullDescription, s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } } }
            ];
            wsDataDetails.push(row);
        });

        const wsDetails = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.sheet_add_aoa(wsDetails, wsDataDetails, { origin: "A1" });
        wsDetails['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
        wsDetails['!cols'] = colWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, wsDetails, 'Hareketler');

        const { categoryData, activeCategories } = createCategorySummaryData(person, allTransactions, periodTransactions, startDateVal);

        if (activeCategories.length > 0) {
            const wsDataSummary = [];

            wsDataSummary.push([{ v: `${person.toUpperCase()} - KATEGORİ ÖZETİ`, s: styles.title }]);
            wsDataSummary.push([{ v: dateRangeText, s: styles.dateRange }]);

            const headerRow = categoryData[0].map(h => ({ v: h, s: styles.summaryHeader }));
            wsDataSummary.push(headerRow);

            let sumColWidths = [25, 15, 15, 15, 15, 12];

            for (let i = 1; i < categoryData.length; i++) {
                const rowData = categoryData[i];
                const durum = rowData[5];

                let rowBg = "FFF2CC";
                if (durum === 'Borçlu') rowBg = "FCE4D6";
                if (durum === 'Alacaklı') rowBg = "E2EFDA";

                const cellStyle = {
                    border: borderStyle,
                    alignment: { horizontal: 'center', vertical: 'center' },
                    fill: { fgColor: { rgb: rowBg } }
                };
                const numStyle = { ...cellStyle, ...styles.cellNumber, alignment: { horizontal: 'right' } };
                const boldNumStyle = { ...numStyle, font: { bold: true } };

                sumColWidths[0] = Math.max(sumColWidths[0], calculateExcelColumnWidth(rowData[0]));
                sumColWidths[1] = Math.max(sumColWidths[1], calculateExcelColumnWidth(rowData[1], true));
                sumColWidths[2] = Math.max(sumColWidths[2], calculateExcelColumnWidth(rowData[2], true));
                sumColWidths[3] = Math.max(sumColWidths[3], calculateExcelColumnWidth(rowData[3], true));
                sumColWidths[4] = Math.max(sumColWidths[4], calculateExcelColumnWidth(rowData[4], true));

                wsDataSummary.push([
                    { v: rowData[0], s: { ...cellStyle, font: { bold: true }, alignment: { horizontal: 'left' } } },
                    { v: rowData[1], t: 'n', s: numStyle },
                    { v: rowData[2], t: 'n', s: numStyle },
                    { v: rowData[3], t: 'n', s: numStyle },
                    { v: rowData[4], t: 'n', s: boldNumStyle },
                    { v: rowData[5], s: cellStyle }
                ]);
            }

            const wsSummary = XLSX.utils.aoa_to_sheet([]);
            XLSX.utils.sheet_add_aoa(wsSummary, wsDataSummary, { origin: "A1" });

            wsSummary['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
            ];

            wsSummary['!cols'] = sumColWidths.map(w => ({ wch: w }));

            XLSX.utils.book_append_sheet(wb, wsSummary, 'Kategori Özeti');
        }

        XLSX.writeFile(wb, `${person}_Ekstre_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('✅ Excel Başarıyla İndirildi', 'success');

    } catch (error) {
        console.error(error);
        showNotification('❌ Excel oluşturulurken hata!', 'error');
    } finally {
        setTimeout(() => exportInProgress = false, 1000);
    }
}

async function exportMonthlySummary() {
    if (exportInProgress) return;
    const person = currentPerson;
    const year = document.getElementById('summaryYearSelect').value;
    const monthIndex = document.getElementById('summaryMonthSelect').value;

    if (!person || !year || monthIndex === "") return showNotification(VALIDATION_MSG.validDate, 'error');

    exportInProgress = true;
    const btn = document.getElementById('generateReportBtn');
    if(btn) { btn.disabled = true; btn.textContent = 'Hazırlanıyor...'; }

    try {
        await ensureExcelLibs();
    } catch (err) {
        exportInProgress = false;
        if(btn) { btn.disabled = false; btn.textContent = 'Rapor Oluştur'; }
        return showNotification('❌ Excel kütüphanesi yüklenemedi', 'error');
    }

    try {
        const monthName = months[monthIndex];

        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, parseInt(monthIndex) + 1, 0);
        endDate.setHours(23, 59, 59);

        let allTxs = getAllTransactionsForPerson(person);

        let totalDevreden = 0;
        let categoryDevir = {};

        if(allData[person].categories) {
            allData[person].categories.forEach(c => categoryDevir[c] = 0);
        }

        allTxs.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate < startDate) {
                if (t.type === 'giden') {
                    totalDevreden += t.amount;
                    if(categoryDevir[t.category] !== undefined) categoryDevir[t.category] += t.amount;
                } else {
                    totalDevreden -= t.amount;
                    if(categoryDevir[t.category] !== undefined) categoryDevir[t.category] -= t.amount;
                }
            }
        });

        const monthlyTxs = allTxs.filter(t => {
            const d = new Date(t.date);
            return d >= startDate && d <= endDate;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        const wb = XLSX.utils.book_new();

        const borderStyle = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        const alignCenter = { horizontal: 'center', vertical: 'center' };
        const alignLeft = { horizontal: 'left', vertical: 'center' };
        const alignRight = { horizontal: 'right', vertical: 'center' };
        const fmtNumber = "#,##0.00";

        function calcWidth(currentMax, value) {
            let valStr = "";
            if (typeof value === 'number') {
                valStr = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(value);
            } else {
                valStr = String(value);
            }
            return Math.max(currentMax, valStr.length + 3);
        }

        const wsDataSummary = [
            [{ v: `${person.toUpperCase()} / ${monthName.toUpperCase()} ${year} - AYLIK HESAP ÖZETİ`, s: { font: { bold: true, sz: 12 }, alignment: alignCenter, fill: { fgColor: { rgb: "FFFFFF" } } } }],
            [
                { v: "Kategori", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Devreden", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Gelen TL", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Giden TL", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Kalan",    s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Durum",    s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } }
            ]
        ];

        let sumColWidths = [20, 10, 10, 10, 10, 10];

        const categories = allData[person].categories ? allData[person].categories.sort() : [];
        let hasSummaryData = false;

        categories.forEach(cat => {
            if(cat === 'BEN') return;

            let ayGelen = 0;
            let ayGiden = 0;

            monthlyTxs.forEach(t => {
                if(t.category === cat) {
                    if(t.type === 'gelen') ayGelen += t.amount;
                    else ayGiden += t.amount;
                }
            });

            const devir = categoryDevir[cat] || 0;

            if (Math.abs(devir) > 0.01 || ayGelen > 0 || ayGiden > 0) {
                hasSummaryData = true;
                const kalan = devir + ayGiden - ayGelen;

                let durum = "-";
                let rowBg = "FFFFFF";

                if (kalan > 0.01) {
                    durum = "Borçlu";
                    rowBg = "FCE4D6";
                } else if (kalan < -0.01) {
                    durum = "Alacaklı";
                    rowBg = "E2EFDA";
                } else {
                    rowBg = "FFF2CC";
                }

                let cellStyle = { border: borderStyle, fill: { fgColor: { rgb: rowBg } }, font: { sz: 11 } };
                const numStyle = { ...cellStyle, numFmt: fmtNumber, alignment: alignRight };
                const boldNumStyle = { ...numStyle, font: { bold: true } };

                sumColWidths[0] = calcWidth(sumColWidths[0], cat);
                sumColWidths[1] = calcWidth(sumColWidths[1], devir);
                sumColWidths[2] = calcWidth(sumColWidths[2], ayGelen);
                sumColWidths[3] = calcWidth(sumColWidths[3], ayGiden);
                sumColWidths[4] = calcWidth(sumColWidths[4], kalan);

                wsDataSummary.push([
                    { v: cat, s: { ...cellStyle, font: { bold: true }, alignment: alignLeft } },
                    { v: devir, t: 'n', s: numStyle },
                    { v: ayGelen, t: 'n', s: numStyle },
                    { v: ayGiden, t: 'n', s: numStyle },
                    { v: kalan, t: 'n', s: boldNumStyle },
                    { v: durum, s: { ...cellStyle, alignment: alignCenter } }
                ]);
            }
        });

        if(!hasSummaryData) wsDataSummary.push([{v: "Bu ay işlem yok.", s: {alignment: alignCenter}}]);

        const wsSummary = XLSX.utils.aoa_to_sheet(wsDataSummary);
        wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

        wsSummary['!cols'] = sumColWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, wsSummary, "Aylık Özet");

        const wsDataMoves = [];

        wsDataMoves.push([
            { v: "KARMOTORS", s: { font: { bold: true, sz: 14 }, alignment: alignCenter } },
            null, null, null, null
        ]);

        wsDataMoves.push([
            { v: `${monthName.toUpperCase()} ${year} - HESAP HAREKETLERİ`, s: { font: { bold: true, sz: 11, color: { rgb: "000000" } }, alignment: alignCenter } },
            null, null, null, null
        ]);

        const headerStyle = {
            fill: { fgColor: { rgb: "D9D9D9" } },
            font: { bold: true, color: { rgb: "000000" } },
            border: borderStyle,
            alignment: alignCenter
        };

        wsDataMoves.push([
            { v: "Tarih", s: headerStyle },
            { v: "Gelen TL", s: headerStyle },
            { v: "Giden TL", s: headerStyle },
            { v: "Kalan TL", s: headerStyle },
            { v: "Açıklama", s: headerStyle }
        ]);

        let moveColWidths = [11, 10, 10, 10, 50];

        let runningBalance = totalDevreden;

        const devirRowStyle = {
            fill: { fgColor: { rgb: "BDD7EE" } },
            border: borderStyle,
            font: { bold: true, italic: true }
        };
        const devirNumStyle = { ...devirRowStyle, numFmt: fmtNumber, alignment: alignRight };

        moveColWidths[3] = calcWidth(moveColWidths[3], runningBalance);

        wsDataMoves.push([
            { v: formatDateTR(startDate), s: { ...devirRowStyle, alignment: alignCenter } },
            { v: "", s: devirRowStyle },
            { v: "", s: devirRowStyle },
            { v: runningBalance, t: 'n', s: devirNumStyle },
            { v: "Önceki Aydan Devir", s: { ...devirRowStyle, alignment: alignLeft } }
        ]);

        monthlyTxs.forEach(t => {
            if (t.type === 'giden') {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }

            let rowFill = "FFFFFF";
            if (t.type === 'gelen') rowFill = "E2EFDA";
            if (t.type === 'giden') rowFill = "FCE4D6";

            const rowStyle = {
                fill: { fgColor: { rgb: rowFill } },
                border: borderStyle,
                alignment: { vertical: "center" }
            };
            const rowNumStyle = { ...rowStyle, numFmt: fmtNumber, alignment: alignRight };
            const rowDateStyle = { ...rowStyle, alignment: alignCenter };

            const dateStr = formatDateTR(new Date(t.date));
            const desc = t.description ? t.description : t.category;

            if(t.type === 'gelen') moveColWidths[1] = calcWidth(moveColWidths[1], t.amount);
            if(t.type === 'giden') moveColWidths[2] = calcWidth(moveColWidths[2], t.amount);
            moveColWidths[3] = calcWidth(moveColWidths[3], runningBalance);

            wsDataMoves.push([
                { v: dateStr, s: rowDateStyle },
                { v: t.type === 'gelen' ? t.amount : "", t: t.type === 'gelen' ? 'n' : 's', s: rowNumStyle },
                { v: t.type === 'giden' ? t.amount : "", t: t.type === 'giden' ? 'n' : 's', s: rowNumStyle },
                { v: runningBalance, t: 'n', s: { ...rowNumStyle, font: { bold: true } } },
                { v: desc, s: { ...rowStyle, alignment: alignLeft, wrapText: true } }
            ]);
        });

        const wsMoves = XLSX.utils.aoa_to_sheet(wsDataMoves);
        wsMoves['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];

        wsMoves['!cols'] = moveColWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, wsMoves, "Aylık Hareketler");

        XLSX.writeFile(wb, `${person}_${monthName}_${year}_Raporu.xlsx`);

        showNotification('✅ Rapor Başarıyla İndirildi', 'success');
        closeCurrentModal(document.getElementById('monthlySummaryModal'));

    } catch (e) {
        console.error(e);
        showNotification('❌ Rapor oluşturulurken hata!', 'error');
    } finally {
        exportInProgress = false;
        if(btn) { btn.disabled = false; btn.textContent = 'Rapor Oluştur'; }
    }
}

async function exportStyledCategoryDetailToExcel(person, categoryName, transactions, openingBalance) {
    if (!transactions || transactions.length === 0) return showNotification('⚠️ Veri yok', 'warning');

    try {
        await ensureExcelLibs();
    } catch (err) {
        return showNotification('❌ Excel kütüphanesi yüklenemedi', 'error');
    }

    const sortedTxs = [...transactions].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const initialBalance = Number(openingBalance) || 0;

    const startDate = formatDateTR(new Date(sortedTxs[0].date));
    const endDate = formatDateTR(new Date(sortedTxs[sortedTxs.length - 1].date));

    const borderStyle = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    const styles = {
        title: {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center', vertical: 'center' }
        },
        dateRange: {
            font: { bold: true },
            alignment: { horizontal: 'left' }
        },
        header: {
            fill: { fgColor: { rgb: "BDD7EE" } },
            font: { bold: true, color: { rgb: "000000" } },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center' }
        },
        rowGiden: {
            fill: { fgColor: { rgb: "FCE4D6" } },
            border: borderStyle,
            alignment: { vertical: 'top', wrapText: true }
        },
        rowGelen: {
            fill: { fgColor: { rgb: "E2EFDA" } },
            border: borderStyle,
            alignment: { vertical: 'top', wrapText: true }
        },
        cellNumber: { numFmt: "#,##0.00" }
    };

    let safeCatName = categoryName.toLocaleUpperCase('tr-TR');
    let titleSuffix = (safeCatName.includes('HESAP') || safeCatName.endsWith(' H.') || safeCatName.endsWith(' H')) ? '' : ' HESABI';
    const titleText = `${person.toLocaleUpperCase('tr-TR')} - ${safeCatName}${titleSuffix} HAREKETLERİ`;

    const wsData = [
        [{ v: titleText, s: styles.title }, null, null, null, null],
        [{ v: `${startDate} - ${endDate}`, s: styles.dateRange }, null, null, null, null],
        [
            { v: "Tarih", s: styles.header },
            { v: "Gelen TL", s: styles.header },
            { v: "Giden TL", s: styles.header },
            { v: "Bakiye", s: styles.header },
            { v: "Açıklama", s: styles.header }
        ]
    ];

    let colWidths = [
        calculateExcelColumnWidth("Tarih", false, true, { emptyWidth: 8, adjustment: -1 }),
        calculateExcelColumnWidth("Gelen TL", false, true, { emptyWidth: 8, adjustment: -1 }),
        calculateExcelColumnWidth("Giden TL", false, true, { emptyWidth: 8, adjustment: -1 }),
        calculateExcelColumnWidth("Bakiye", false, true, { emptyWidth: 8, adjustment: -1 }),
        50
    ];

    let runningBalance = initialBalance;

    sortedTxs.forEach(tx => {
        let amountNum = Number(tx.amount);

        if (tx.type === 'giden') {
            runningBalance += amountNum;
        } else {
            runningBalance -= amountNum;
        }

        runningBalance = Math.round(runningBalance * 100) / 100;

        const dateStr = formatDateTR(new Date(tx.date));
        const amountStr = new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amountNum);
        const balanceStr = new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(runningBalance));

        const dateWidth = calculateExcelColumnWidth(dateStr, false, false, { emptyWidth: 8, adjustment: -1 });
        if (dateWidth > colWidths[0]) colWidths[0] = dateWidth;

        if (tx.type === 'gelen') {
            const gelenWidth = calculateExcelColumnWidth(amountStr, true, false, { emptyWidth: 8, adjustment: -1 });
            if (gelenWidth > colWidths[1]) colWidths[1] = gelenWidth;
        }

        if (tx.type === 'giden') {
            const gidenWidth = calculateExcelColumnWidth(amountStr, true, false, { emptyWidth: 8, adjustment: -1 });
            if (gidenWidth > colWidths[2]) colWidths[2] = gidenWidth;
        }

        const bakiyeWidth = calculateExcelColumnWidth(balanceStr, true, false, { emptyWidth: 8, adjustment: -1 });
        if (bakiyeWidth > colWidths[3]) colWidths[3] = bakiyeWidth;

        let rowStyleBase = tx.type === 'giden' ? styles.rowGiden : styles.rowGelen;

        const row = [
            {
                v: dateStr,
                s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top' } }
            },
            {
                v: tx.type === 'gelen' ? amountNum : "",
                t: tx.type === 'gelen' ? 'n' : 's',
                s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } }
            },
            {
                v: tx.type === 'giden' ? amountNum : "",
                t: tx.type === 'giden' ? 'n' : 's',
                s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } }
            },
            {
                v: runningBalance,
                t: 'n',
                s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } }
            },
            {
                v: tx.description || '',
                s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } }
            }
        ];

        wsData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    XLSX.utils.sheet_add_aoa(ws, wsData, { origin: "A1" });

    ws['!cols'] = [
        { wch: colWidths[0] },
        { wch: colWidths[1] },
        { wch: colWidths[2] },
        { wch: colWidths[3] },
        { wch: 50 }
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Hareketler");
    XLSX.writeFile(wb, `${categoryName}_Ekstre_${person}.xlsx`);

    showNotification('✅ Excel İndirildi (Otomatik Boyutlandırma)', 'success');
    return true;
}

    global.SahsiReportExports = Object.freeze({
        exportSummaryExcel,
        exportCurrentCategoryDetailToExcel,
        exportToExcel,
        exportMonthlySummary,
        exportStyledCategoryDetailToExcel,
    });
})(window);
