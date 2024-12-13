import React, { useState, useEffect, useMemo } from 'react';
import 'tdesign-react/es/style/index.css';
import { Input, List, Link, Space, Tooltip, Typography, Layout } from 'tdesign-react';
import './Newtab.scss';
import { pinyin } from 'pinyin-pro';
import { getColor } from '../../utils/color';
const { Header, Content, Footer, Aside } = Layout;

const { ListItem } = List;
const { Text } = Typography;
function getPinyinInfo(text) {
  // 获取拼音全拼，使用'-'连接每个字的拼音
  const py = pinyin(text, { toneType: "none", type: "array" });
  const fullPinyin = py.join('');
  // 获取拼音首字母组合，使用''连接每个字的拼音首字母
  const firstLetter = py.map(s => s[0]).join('');
  return [fullPinyin, firstLetter];
}

function flattenBookmarks(bookmarkTree) {
  const flattened = [];
  const processNode = (node, parent = null) => {
    if (node.url) {
      // 如果节点有url属性，说明是一个书签项，直接添加到扁平化数组中
      flattened.push({
        id: node.id,
        title: node.title,
        url: node.url,
        parentId: node.parentId,
        dateLastUsed: node.dateLastUsed,
        parentTitle: parent?.title || '',
        img: `https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}`
      });
    } else {
      // 如果节点没有url属性，说明是一个文件夹（包含子书签或子文件夹），递归处理其子节点
      node.children && node.children.forEach((o) => processNode(o, node));
    }
  };
  bookmarkTree.forEach(processNode);
  return flattened;
}


const fetchHistory = async () => {
  return new Promise((resolve, reject) => {
    chrome.history.search({ text: '', maxResults: 10000 }, (historyItems) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(historyItems);
      }
    });
  });
};


const Newtab = () => {
  const [bookmarks, setBookmarks] = useState([]); // 存储收藏夹网址数据
  const [searchText, setSearchText] = useState(''); // 存储搜索框输入的文本

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const [bookmarkTree, historyItems] = await Promise.all([
          chrome.bookmarks.getTree(),
          fetchHistory()
        ]);

        const bookMap = {};

        const getFavicon = (url) => {
          const host = new URL(url).hostname;
          if (!host) {
            return '';
          }
          const store_url = localStorage.getItem('favicons-' + host);
          if (store_url) {
            return store_url;
          }
          return `https://${host}/favicon.ico`;
        }
        // 将历史记录项添加到书签列表中
        historyItems.forEach(historyItem => {
          const bookmark = {
            id: 'history:' + historyItem.id,
            title: historyItem.title,
            url: historyItem.url,
            parentId: null,
            dateLastUsed: historyItem.lastVisitTime,
            typedCount: historyItem.typedCount,
            parentTitle: 'History',
            img: getFavicon(historyItem.url),
            clickCount: (historyItem.visitCount || 0)
          };
          bookMap[bookmark.url] = bookmark;
        });
        flattenBookmarks(bookmarkTree).forEach(bookmark => {
          bookMap[bookmark.url] = { clickCount: 0, ...bookMap[bookmark.url], ...bookmark, img: getFavicon(bookmark.url) };
        });



        setBookmarks(Object.values(bookMap));
      } catch (error) {
        console.error('获取书签数据失败：', error);
      }
    };
    fetchBookmarks();
  }, []);

  const handleSearch = (text) => {
    const last = text[text.length - 1];
    if (/\d/.test(last) && filteredBookmarks[last]) {
      return jump(filteredBookmarks[last]?.url);
    }
    setSearchText(text);
  };

  const jump = (url) => {
    if (url) {
      setSearchText('');
      // 点击跳转时增加对应书签的点击次数，并保存到本地存储
      // const updatedBookmarks = bookmarks.map(bookmark => {
      //   if (bookmark.url === url) {
      //     const newClickCount = (bookmark.clickCount || 0) + 1;
      //     localStorage.setItem(`click_count_${url}`, newClickCount.toString());
      //     return {
      //       ...bookmark,
      //       clickCount: newClickCount
      //     };
      //   }
      //   return bookmark;
      // });
      // setBookmarks(updatedBookmarks);
      // window.open(url);
      location.href = url;
    }

  }
  const handleEnter = () => {
    if (filteredBookmarks.length > 0) {
      jump(filteredBookmarks[0]?.url);
    }
  };

  const handleImageError = (event, url) => {
    const host = new URL(url).hostname;
    if (!event.target.src.startsWith('https://www.google.com')) {
      event.target.src = `https://www.google.com/s2/favicons?domain=${host}&size=64`;
      localStorage.setItem('favicons-' + host, event.target.src);
    } else {
      localStorage.setItem('favicons-' + host, '');
      event.target.style.display == 'none';
    }
  };

  const handleImageLoad = (event, url) => {
    if (event.target.naturalWidth < 16) {
      handleImageError(event, url);
    }
  };

  const weightedSort = (a, b) => {
    const diff = (b.weight + (b.clickCount || 0)) - (a.weight + (a.clickCount || 0));
    if (diff != 0) return diff;
    if (b.dateLastUsed && a.dateLastUsed) {
      return b.dateLastUsed - a.dateLastUsed;
    }
    return (b.dateLastUsed || 0) - (a.dateLastUsed || 0);
  };

  // 使用useMemo根据searchText、bookmarks来计算filteredBookmarks
  const filteredBookmarks = useMemo(() => {
    if (searchText) {
      // 创建正则表达式对象，忽略大小写进行匹配
      const token = searchText.trim().split(/\s+/).filter(Boolean);
      const reg = new RegExp(token.join('|'), 'ig');
      const result = bookmarks.map(bookmark => {
        const matchContent = getPinyinInfo(bookmark.title).join(' ') + bookmark.parentTitle + bookmark.title + bookmark.url;
        const matchArr = matchContent.match(reg) || [];
        const tokenMap = token.reduce((prev, curr) => { prev[curr] = 1; return prev; }, {});
        return {
          ...bookmark,
          matchContent,
          weight: matchArr.length + matchArr.reduce((prev, curr) => {
            if (tokenMap[curr]) {
              delete tokenMap[curr];
              return prev + 100;
            }
            return prev;
          }, 0)
        }
      }).filter(bookmark => bookmark.weight > 0 && /^https?:/.test(bookmark.url)).sort(weightedSort);
      console.log(JSON.stringify(result));
      return result;
    }
    return bookmarks.filter(bookmark => /^https?:/.test(bookmark.url)).sort((a, b) => {
      const diff = b.clickCount - a.clickCount;
      if (diff != 0) return diff;
      return b.dateLastUsed - a.dateLastUsed;
    });
  }, [searchText, bookmarks]);



  return (
    <Layout className="new-tab" style={{ padding: 24, height: '100vh' }}>
      <div>
        <Input placeholder="请输入关键词或拼音首字母搜索，数字跳转对应页面" size='large' value={searchText} onChange={handleSearch} clearable autofocus />
      </div>
      <Content style={{ flex: 1 }}>
        <div className="new-tab__address-list">
          {filteredBookmarks.map((item, index) => (<Tooltip content={item.url} key={item.id + index}>
            <div style={{ backgroundColor: getColor(item.parentId + item.parentTitle) }} className="new-tab__address-list--card" onClick={() => jump(item.url)}>
              {index < 10 ? <Text code>{index}.</Text> : ''}{item.img ? <img src={item.img} onLoad={(event) => handleImageLoad(event, item.url)} onError={(event) => handleImageError(event, item.url)} /> : null}<span>{item.parentTitle}-{item.title}</span>
            </div>
          </Tooltip>))}
        </div>

      </Content>
    </Layout>
  );
};


export default Newtab;
