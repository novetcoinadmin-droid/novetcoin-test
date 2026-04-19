// auth-check.js

const SUPABASE_URL = "https://brgaykxyfgylzyujrjbp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2F5a3h5Zmd5bHp5dWpyamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQxNDUsImV4cCI6MjA5MDIwMDE0NX0.HRN3DDpjFKeiyfhdhvcHOHg0lvnSvozJwBFsL0E12e0";

// 全ページで使い回せるように、window（グローバル）に定義する
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. 右パネル（マイステータス）の表示処理 ---
window.addEventListener("load", async () => {
    // ★ index.html の場合は専用の描画スクリプトがあるため、ここでは何もしない（競合防止）
    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/my-site/');
    if (isIndexPage) return;

    const savedEmail = localStorage.getItem('userEmail');
    const panel = document.getElementById("rightPanel");

    if (!panel) return;

    if (!savedEmail) {
        panel.innerHTML = `
            <h3>ゲストさん</h3>
            <p style="font-size:12px; color:#666; margin-bottom:15px;">ログインすると執筆や報酬の受け取りが可能です。</p>
            <a href="login.html" class="right-btn" style="background:#4285F4; display:block; text-align:center; color:white; padding:10px; text-decoration:none; border-radius:5px;">ログイン画面へ</a>
        `;
        return;
    }

    const { data: profile } = await window.supabaseClient.from('profiles').select('*').eq('email', savedEmail).maybeSingle();

    if (profile) {
        panel.innerHTML = `
            <h3 style="border-bottom: 2px solid #6a0dad; padding-bottom: 5px; margin-bottom: 15px;">マイステータス</h3>
            <p style="font-size:13px; margin-bottom:10px;"><b>👤 アカウント：</b><br>${profile.username || "名称未設定"}</p>
            <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:15px; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="font-size:13px; font-weight:bold; color:#6a0dad;">💎 NVT</span>
                    <span style="font-size:13px; font-weight:bold;">${(profile.nvt_balance || 0).toLocaleString()}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="font-size:13px; font-weight:bold; color:#ff8c00;">💰 NP</span>
                    <span style="font-size:13px; font-weight:bold;">${(profile.np_balance || 0).toLocaleString()}</span>
                </div>
            </div>
            <a href="../portal/account.html" class="right-btn" style="display:block; text-align:center; background:#6a0dad; color:white; padding:8px; text-decoration:none; border-radius:5px; margin-bottom:10px;">マイページ / お財布</a>
            <button onclick="handleLogout()" style="background:none; border:none; color:#999; text-decoration:underline; font-size:11px; cursor:pointer; width:100%;">ログアウト</button>
        `;
    }
});

// --- 2. ログアウト処理（完全版） ---
async function handleLogout() {
    try {
        // 1. Supabase からサインアウト
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        // 2. Web3Auth がつながっていればログアウト
        if (window.web3auth && window.web3auth.connected) {
            await window.web3auth.logout();
        }
    } catch (err) {
        console.error("サインアウト中にエラー:", err);
    } finally {
        // 3. ブラウザの記憶を完全に消去
        localStorage.clear();
        // 4. トップページへリダイレクト
        window.location.href = window.location.pathname.includes("my-siteman")
  ? "../my-site/index.html"
  : "index.html";
    }
}