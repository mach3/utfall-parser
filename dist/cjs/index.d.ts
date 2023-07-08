/**
 * ファイルをダウンロードしてパスを返す
 * @param {string} destDir
 * @param {string} url
 * @returns {string}
 */
export declare function download(destDir: string, url?: string): string;
/**
 * 住所データの型
 */
interface AddressItem {
    zipcode: string;
    pref: string;
    components: string[];
    address: string;
    notes?: string;
}
/**
 * CSVをパースして住所データを返す
 * @param {string} csvString
 * @returns {AddressItem[]}
 */
export declare function parse(csvString: string): AddressItem[];
/**
 * 住所データから郵便番号で住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns {AddressItem[] | Error}
 */
export declare function findByZipcode(zipcodeString: string, data: AddressItem[]): AddressItem[] | Error;
/**
 * 類似度が高い順にソートする
 * 類似度が同じ場合は文字数が少ない順にソートする
 * @param {string} kneedle
 * @param {AddressItem[]} data
 * @returns {AddressItem[]}
 */
export declare function similaritySort(kneedle: string, data: AddressItem[]): AddressItem[];
/**
 * 住所から住所を検索する
 * @param {string} address
 * @param {AddressItem[]} data
 * @param {boolean} [sort]
 * @returns {AddressItem[] | Error}
 */
export declare function findByAddress(address: string, data: AddressItem[], sort?: boolean): AddressItem[] | Error;
/**
 * 住所の部品からAND/OR検索する
 * @param {string[]} components
 * @param {AddressItem[]} data
 * @param {boolean} isOr
 * @returns {AddressItem[] | Error}
 */
export declare function findByComponents(components: string[], data: AddressItem[], isOr?: boolean): AddressItem[] | Error;
export {};
