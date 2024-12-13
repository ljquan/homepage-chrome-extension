
const color = [
    '#ECF2FE',
    '#F2F2FF',
    '#FFF0F8',
    '#FFF0EC',
    '#FFEFFF',
    '#E8FAF7',
    '#ECF8DB',
    '#FFF5E4',
    '#FCFCD2D2',
    '#EEF9F5',
    '#E4FADB',
];

// 字符串hash转0～1的数字
function hashCode(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 8) - hash + char;
        hash |= 0; // 将哈希值转换为32位整数
    }
    return hash;
}

export function hashToFloat(str: string) {
    const hash = hashCode(str);
    const floatHash = (hash + Math.pow(2, 31)) / (2 * Math.pow(2, 31));
    return floatHash;
}


/** 尽可能确保不重复，同时id和颜色尽可能一致*/
export function getHashIndexer(length: number) {
    const hashIndex: boolean[] = new Array(length);
    let lastIndex = 0;
    const hashCache: Record<string, number> = {};
    return (str: string) => {
        if (!hashCache[str]) {
            if (lastIndex < length) {
                // 取整
                const index = (hashToFloat(str) * length) | 0;
                if (hashIndex[index]) {
                    for (let i = 0; i < hashIndex.length; i++) {
                        if (hashIndex[i]) {
                            continue;
                        }
                        hashCache[str] = i;
                        hashIndex[i] = true;
                        return i;
                    }
                    lastIndex = Math.max(length, lastIndex);
                    hashCache[str] = lastIndex % length;
                    lastIndex++;
                } else {
                    hashCache[str] = index;
                }
            }
        }
        return hashCache[str];
    };
}


const indexer = getHashIndexer(color.length);
export const getColor = (str: string) => {
    return color[indexer(str)];
}