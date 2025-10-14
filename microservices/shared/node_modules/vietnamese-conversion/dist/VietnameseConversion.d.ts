import VietnameseConversionInterface from './VietnameseConversionInterface';
export declare class VietnameseConversion implements VietnameseConversionInterface {
    private _charsets;
    private _text;
    private _chartset;
    constructor(text: string, charset: string);
    private isValidCharset;
    private getCharsArray;
    toCharset(charset: string): string;
}
export default VietnameseConversion;
