// auth-check.js

const SUPABASE_URL = "https://brgaykxyfgylzyujrjbp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2F5a3h5Zmd5bHp5dWpyamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQxNDUsImV4cCI6MjA5MDIwMDE0NX0.HRN3DDpjFKeiyfhdhvcHOHg0lvnSvozJwBFsL0E12e0";

// 全ページで使い回せるように、window（グローバル）に定義する
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🚀 【魔法のコード：影武者】
// 各ページにある古い `getUser()` が呼ばれたら、これが代わりに返事をする
window.supabaseClient.auth.getUser = async () => {
    const savedEmail = localStorage.getItem('userEmail'); // メモ帳を見る
    
    if (!savedEmail) {
        // メモがない（未ログイン）なら、古いコードに「いないよ」と伝える
        return { data: { user: null } }; 
    }

    // メモがあるなら、Supabaseからプロフィールを引く
    const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', savedEmail)
        .maybeSingle();

    if (profile) {
        // 古いコードが user.id を使っていてもエラーにならないように、ダミーのユーザー情報を渡す
        return { 
            data: { 
                user: { id: profile.id, email: profile.email } 
            } 
        };
    }
    return { data: { user: null } };
};

// --- ここから下は右パネル（マイステータス）の表示処理 ---
window.addEventListener("load", async () => {
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

function handleLogout() {
    localStorage.removeItem('userEmail');
    location.href = "index.html";
}