// config.js
// このファイルが「司令塔」になります
const CONFIG = {
  PRICE_MODE: "fixed",      // 初期フェーズ：固定レート [cite: 5, 7]
  NVT_TO_JPY: 150,          // 1 NVT = 150円 [cite: 5]
  REWARD_THRESHOLD: 4000,   // 4000文字で報酬
  REWARD_AMOUNT: 1          // 付与するNVT数
};

// レート取得関数 [cite: 10]
function getNVTPrice() {
  if (CONFIG.PRICE_MODE === "fixed") {
    return CONFIG.NVT_TO_JPY;
  } else {
    // 将来の市場連動用 [cite: 6, 11]
    return 150; 
  }
}