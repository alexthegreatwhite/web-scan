import * as ZXing from '@zxing/library';

console.log('MultiFormatReader:', !!ZXing.MultiFormatReader);
console.log('RGBLuminanceSource:', !!ZXing.RGBLuminanceSource);
console.log('BinaryBitmap:', !!ZXing.BinaryBitmap);
console.log('HybridBinarizer:', !!ZXing.HybridBinarizer);
console.log('BarcodeFormat:', Object.keys(ZXing.BarcodeFormat || {}));
