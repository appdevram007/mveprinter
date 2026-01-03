const printReceipt = async () => {

 let job={
  "shopname": "KAYDEN",
  "contact": "012-345 6789",
  "address": "12, Jalan SS2/24,\n47300 Petaling Jaya,\nSelangor",
  "customerName": "Mr. Lim Wei Jian",
  "customerAddress": "No. 8, Jalan Bukit Indah 3,\nTaman Bukit Indah,\n81200 Johor Bahru",
  "items": [
    {
      "name_cn": "新鲜",
      "name_en": "Fresh Chicken Thigh",
      "quantity": 2,
      "price": 12.50
    },
    {
      "name_cn": "五花",
      "name_en": "Local Pork Belly",
      "quantity": 1,
      "price": 38.00
    },
    {
      "name_cn": "精选",
      "name_en": "Imported Beef Slice",
      "quantity": 3,
      "price": 28.90
    }
  ],
  "total": 150.70
}

  await SunmiPrinter.prepare()

  await SunmiPrinter.resetPrinterStyle()
  await SunmiPrinter.setAlignment('center')

  // HEADER
 // ===== CUSTOMER INFO =====
  await SunmiPrinter.setAlignment('left');
  await SunmiPrinter.setFontSize(22);
  await SunmiPrinter.setTextStyle('bold', true);
  await SunmiPrinter.printText(`Customer: ${job.customerName}`);
    await SunmiPrinter.printText(`Phone : +60-1234567821`);
  await SunmiPrinter.printText(`${job.customerAddress}`);

  await SunmiPrinter.lineWrap(1)
  await SunmiPrinter.printHR('line')

  // ITEMS
  for (const i of job.items) {
    let unit = i.quantity % 2 === 0 ? 'kg' : 'kati';

    // 🔴 Chinese name + qty + unit (BIG)
    await SunmiPrinter.setFontSize(28)
    await SunmiPrinter.setTextStyle('bold', true)

   await SunmiPrinter.printColumnsString(
      [i.name_cn, `${i.quantity} ${unit}`],
      [22, 10],
      ['left', 'right']
    )

    // 🔵 English name + price (SMALL, SAME LINE)
    await SunmiPrinter.setFontSize(18)
    await SunmiPrinter.setTextStyle('bold', false)

    await SunmiPrinter.printColumnsString(
      [
        i.name_en,
        `RM ${i.price.toFixed(2)}`,
      ],
      [22, 10],
      ['left', 'right']
    )

    await SunmiPrinter.lineWrap(1)
  }

  // TOTAL
  await SunmiPrinter.printHR('line')

  await SunmiPrinter.setFontSize(26)
  await SunmiPrinter.setTextStyle('bold', true)

  await SunmiPrinter.printColumnsString(
    ['TOTAL', `RM ${job.total.toFixed(2)}`],
    [22, 10],
    ['left', 'right']
  )

  await SunmiPrinter.lineWrap(3)
  await SunmiPrinter.resetPrinterStyle()
}
