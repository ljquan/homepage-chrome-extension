
export function copyToClipboard(text: string) {
    if (!text) {
        return false;
    }
    // 创建一个临时的文本区域元素
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);

    // 选择文本区域的内容
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length); // 对于移动设备

    // 尝试执行复制命令
    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copying text command was ' + msg);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
    } finally {
        // 移除临时的文本区域元素
        document.body.removeChild(textArea);
    }
    return false;
}