import { execSync } from 'child_process';
import path from 'path';
// const UTF_ALL_URL = 'https://www.post.japanpost.jp/zipcode/utf_all.csv';
// const UTF_ALL_ZIP_URL = 'https://www.post.japanpost.jp/zipcode/dl/utf/zip/utf_all.zip';
const UTF_ALL_ZIP_URL = 'https://www.post.japanpost.jp/zipcode/dl/utf/zip/utf_ken_all.zip';
const ZEN_NUM_MAP = '０１２３４５６７８９';
/**
 * ファイルをダウンロードしてパスを返す
 * @param {string} destDir
 * @param {string} url
 * @returns {string}
 */
export function download(destDir = './', url = UTF_ALL_ZIP_URL) {
    const destZipPath = path.join(destDir, path.basename(url));
    execSync(`curl -o ${destZipPath} ${url}`);
    execSync(`unzip -o ${destZipPath} -d ${destDir}`);
    const destPath = execSync(`find ${destDir} -name '*.csv' | head -n 1`).toString().replace(/\s/g, '');
    return destPath;
}
/**
 * 住所文字列から余計な文字を削除する
 * @param {string} addressString
 * @returns {string}
 */
export function cleanAddress(addressString) {
    if (/(くる|ない)場合/.test(addressString)) {
        return '';
    }
    return addressString.replace(/([^^])一円/, '$1')
        .replace(/（高層棟）/, '')
        .replace(/（(.+?)除く）/, '')
        .replace(/（(.+?)含む）/, '')
        .replace(/（その他）/, '')
        .replace(/「(.+?)」/g, '')
        .replace(/〔(.+?)構内〕/g, '')
        .replace(/以上/g, '')
        .replace(/（地階・階層不明）/g, '')
        .replace(/（.+(以降|以内)）/g, '')
        .replace(/（(丁目|番地)）/g, '')
        .replace(/甲、乙/g, '')
        .replace(/^([^（]+?)[０-９]+.+(、|～).+$/, '$1');
}
/**
 * 住所から括弧内の文字列を取り除き、括弧内の文字列と一緒に返す
 * @param {string} addressString
 * @returns {[string, string?]}
 */
function parseBrackets(addressString) {
    const pattern = /（.+）/;
    const m = addressString.match(pattern);
    if (m !== null) {
        const notes = m[0].replace(/[（）「」]/g, '');
        return [
            addressString.replace(pattern, ''),
            notes
        ];
    }
    return [addressString, undefined];
}
/**
 * 住所文字列をパースして、住所と備考を返す
 * @param addressString
 * @returns {{ address?: string, notes?: string }}
 */
function parseAddress(addressString) {
    const isSingleStreet = (content) => {
        if (/^[ア-ン]+?$/.test(content)) {
            return false;
        }
        return !/[、〜・]/.test(content);
    };
    const isMultipleAddress = (content) => {
        return !/[（）]/.test(content) && /[、〜]/.test(content);
    };
    const address = cleanAddress(addressString);
    const m = address.match(/(.+)（(.+?)）/);
    if (m !== null) {
        const [, prefix, content] = m;
        if (isMultipleAddress(prefix)) {
            return {
                notes: address
            };
        }
        else if (isSingleStreet(content)) {
            return {
                address: `${prefix}${content}`
            };
        }
        else {
            const [street, notes] = parseBrackets(address);
            return {
                address: street,
                notes
            };
        }
    }
    if (isMultipleAddress(address)) {
        return {
            notes: address
        };
    }
    return {
        address
    };
}
;
/**
 * CSVをパースして住所データを返す
 * @param {string} csvString
 * @returns {AddressItem[]}
 */
export function parse(csvString) {
    const rows = csvString.split('\n').filter((row) => row !== '');
    const data = [];
    rows.forEach((row) => {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [, , zipcode, prefKana, cityKana, addressKana, pref, city, address, isAddressDuplicated, , , isZipcodeDupulicated, isUpdated, updatedReason] = row.replace(/"/g, '').split(',');
        /* eslint-enable @typescript-eslint/no-unused-vars */
        const parsedAddress = parseAddress(address);
        const components = [pref, city];
        if (parsedAddress.address !== undefined) {
            components.push(parsedAddress.address);
        }
        data.push({
            zipcode,
            pref,
            components: components.filter(value => value),
            address: components.slice(1).join(''),
            notes: parsedAddress.notes
        });
    });
    return Array.from(new Set(data.map(it => JSON.stringify(it))))
        .map(json => JSON.parse(json));
}
/**
 * 正しい郵便番号文字列かどうかをテストする
 * @param {string} value
 * @returns {string | null}
 */
export function parseZipcode(value) {
    const zipcode = value
        .replace(/[０-９]/g, (s) => ZEN_NUM_MAP.indexOf(s).toString())
        .replace(/[^\d]/g, '');
    const isLikeZipcode = zipcode.length > 2 && zipcode.length < 8 && (value.length - zipcode.length) < zipcode.length;
    return isLikeZipcode ? zipcode : null;
}
/**
 * 住所データから郵便番号で住所を検索する
 * @param {string} zipcodeString
 * @param {AddressItem[]} data
 * @returns {AddressItem[] | Error}
 */
export function findByZipcode(zipcodeString, data) {
    const zipcode = parseZipcode(zipcodeString);
    if (zipcode === null) {
        return new Error('Invalid Zipcode');
    }
    const pattern = new RegExp(`^${zipcode}`);
    return data.filter((item) => pattern.test(item.zipcode));
}
/**
 * 類似度が高い順にソートする
 * 類似度が同じ場合は文字数が少ない順にソートする
 * @param {string} kneedle
 * @param {AddressItem[]} data
 * @returns {AddressItem[]}
 */
export function similaritySort(kneedle, data) {
    const result = [...data];
    const kneedleSet = new Set(kneedle);
    const getSimilarity = (value) => {
        return Array.from(value).reduce((a, c) => {
            return kneedleSet.has(c) ? a + 1 : a;
        }, 0);
    };
    result.sort((a, b) => {
        const aValue = `${a.pref}${a.address}`;
        const bValue = `${b.pref}${b.address}`;
        const aSim = getSimilarity(aValue);
        const bSim = getSimilarity(bValue);
        if (aSim === bSim) {
            return aValue.length - bValue.length;
        }
        else {
            return bSim - aSim;
        }
    });
    return result;
}
/**
 * 住所から住所を検索する
 * @param {string} address
 * @param {AddressItem[]} data
 * @param {boolean} [sort]
 * @returns {AddressItem[] | Error}
 */
export function findByAddress(address, data, sort = true) {
    if (address.length === 0) {
        return new Error('Invalid Address');
    }
    const result = data.filter(it => {
        const itsAddress = `${it.pref}${it.address}`;
        return itsAddress.includes(address) ||
            address.includes(itsAddress) ||
            it.address.includes(address) ||
            address.includes(it.address);
    });
    return sort ? similaritySort(address, result) : result;
}
/**
 * 住所の部品からAND/OR検索する
 * @param {string[]} components
 * @param {AddressItem[]} data
 * @param {boolean} isOr
 * @returns {AddressItem[] | Error}
 */
export function findByComponents(components, data, isOr = false) {
    if (components.length === 0 || components.join('').length === 0) {
        return new Error('Invalid Parameter');
    }
    const method = isOr ? 'some' : 'every';
    return data.filter(it => {
        const itsAddress = `${it.pref}${it.address}`;
        if (components.length > 1) {
            return components[method]((component) => {
                return itsAddress.includes(component);
            });
        }
        return itsAddress.includes(components[0]);
    });
}
function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}
/**
 * 任意の型のクエリをわたして住所を検索する
 * @param {string | string[]} query
 * @param {AddressItem[]} data
 * @param {FindOptions} options
 * @returns
 */
export function find(query, data, options = {}) {
    const value = getType(query) === 'Array'
        ? query
        : (() => {
            const values = query.split(/\s/);
            return values.length > 1 ? values : query;
        })();
    // components ?
    if (getType(value) === 'Array') {
        if (value.every(it => (getType(it) === 'String'))) {
            return findByComponents(value, data, options.isOr);
        }
        return new Error('Invalid Array');
    }
    // zipcode ?
    if (getType(value) === 'String') {
        const zipcode = parseZipcode(value);
        if (zipcode !== null) {
            return findByZipcode(value, data);
        }
        // address !
        return findByAddress(value, data, options.sort);
    }
    return new Error('Invalid Query');
}
