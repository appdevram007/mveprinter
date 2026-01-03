import * as SunmiPrinter from '@mitsuharu/react-native-sunmi-printer-library';

export const initPrinter = async () => {
  try {
    await SunmiPrinter.prepare();
    
    let printerStatus = {
      connected: true,
      model: 'SUNMI V2',
      temperature: 25,
      paperStatus: 'Normal'
    };

    try {
      const model = await SunmiPrinter.getPrinterModel();
      const temperature = await SunmiPrinter.getPrinterTemperature();
      const paperStatus = await SunmiPrinter.getPrinterPaper();
      
      printerStatus = {
        connected: true,
        model: model || 'SUNMI V2',
        temperature: temperature || 25,
        paperStatus: paperStatus === 0 ? 'Normal' : 'Low/Error'
      };
    } catch (e) {
      // Use default values if status calls fail
    }

    return { success: true, printerStatus };
  } catch (e) {
    console.error("❌ SUNMI Printer Error", e);
    return {
      success: false,
      printerStatus: {
        connected: false,
        model: 'Unknown',
        temperature: 0,
        paperStatus: 'Disconnected'
      }
    };
  }
};

export const printOrder = async (order, userInfo) => {
  try {
    await SunmiPrinter.prepare();

    // HEADER
    await SunmiPrinter.setAlignment(1);
    await SunmiPrinter.bold(true);
    await SunmiPrinter.printText(`${userInfo?.restaurant || 'MY RESTAURANT'}\n`);
    await SunmiPrinter.printText('====================\n\n');

    await SunmiPrinter.setAlignment(0);
    await SunmiPrinter.bold(false);

    // ORDER INFO
    await SunmiPrinter.printText(`Order: ${order.orderNumber}\n`);
    await SunmiPrinter.printText(`Date: ${new Date().toLocaleString()}\n`);
    
    if (order.customerName) {
      await SunmiPrinter.printText(`Customer: ${order.customerName}\n`);
    }
    
    if (order.tableNumber) {
      await SunmiPrinter.printText(`Table: ${order.tableNumber}\n`);
    }
    
    if (order.deliveryType) {
      await SunmiPrinter.printText(`Type: ${order.deliveryType.toUpperCase()}\n`);
    }
    
    await SunmiPrinter.printText('----------------------\n\n');

    // ITEMS
    await SunmiPrinter.bold(true);
    await SunmiPrinter.printText('ITEMS:\n');
    await SunmiPrinter.bold(false);
    
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        await SunmiPrinter.printText(`${item.name} x${item.quantity}\n`);
        await SunmiPrinter.printText(`  RM ${((item.price || 0) * item.quantity).toFixed(2)}\n`);
        if (item.notes) {
          await SunmiPrinter.printText(`  Note: ${item.notes}\n`);
        }
      }
    }

    await SunmiPrinter.printText('\n----------------------\n');

    // TOTALS
    if (order.subtotal) {
      await SunmiPrinter.printText(`Subtotal: RM ${order.subtotal.toFixed(2)}\n`);
    }
    
    if (order.tax) {
      await SunmiPrinter.printText(`Tax: RM ${order.tax.toFixed(2)}\n`);
    }
    
    if (order.tip) {
      await SunmiPrinter.printText(`Tip: RM ${order.tip.toFixed(2)}\n`);
    }

    await SunmiPrinter.bold(true);
    if (order.total) {
      await SunmiPrinter.printText(`TOTAL: RM ${order.total.toFixed(2)}\n`);
    }
    await SunmiPrinter.bold(false);

    await SunmiPrinter.printText('\n====================\n');
    await SunmiPrinter.setAlignment(1);
    await SunmiPrinter.printText('Thank You!\n\n\n\n');

    // CUT PAPER
    try {
      await SunmiPrinter.cutPaper();
    } catch (e) {
      console.log('Paper cut not supported');
    }

    return { success: true };
  } catch (err) {
    console.error("❌ Print error:", err);
    return { success: false, error: err.message };
  }
};

export const testPrint = async (useRealApi) => {
  try {
    await SunmiPrinter.prepare();

    await SunmiPrinter.setAlignment(1);
    await SunmiPrinter.bold(true);
    await SunmiPrinter.printText('TEST PRINT\n');
    await SunmiPrinter.printText('===============\n\n');

    await SunmiPrinter.bold(false);
    await SunmiPrinter.setAlignment(0);
    
    await SunmiPrinter.printText('This is a test print\n');
    await SunmiPrinter.printText('from MVE Printer App\n\n');
    
    await SunmiPrinter.printText('Date: ' + new Date().toLocaleString() + '\n');
    await SunmiPrinter.printText(`Mode: ${useRealApi ? 'API Mode' : 'Dummy Mode'}\n`);
    await SunmiPrinter.printText('Status: OK\n\n');
    
    await SunmiPrinter.printText('===============\n');
    await SunmiPrinter.setAlignment(1);
    await SunmiPrinter.printText('TEST COMPLETE\n\n\n\n');

    try {
      await SunmiPrinter.cutPaper();
    } catch (e) {
      console.log('Paper cut not supported');
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};