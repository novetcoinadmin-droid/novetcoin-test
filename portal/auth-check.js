// auth-check.js

const SUPABASE_URL = "https://brgaykxyfgylzyujrjbp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2F5a3h5Zmd5bHp5dWpyamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQxNDUsImV4cCI6MjA5MDIwMDE0NX0.HRN3DDpjFKeiyfhdhvcHOHg0lvnSvozJwBFsL0E12e0";
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================
// 共通設定：NVTオンチェーン残高取得
// =====================================================

const NOVET_NVT_CONTRACT_ADDRESS = "0x2bcabf131ab1d3620914f17b576bd3d6fa76812e";
const NOVET_POLYGON_RPC_URL = "https://polygon.publicnode.com";

async function fetchNovetOnchainNvtBalance(walletAddress) {
    if (!walletAddress) return null;

    try {
        const cleanAddress = String(walletAddress).toLowerCase().replace(/^0x/, "");

        if (!/^[0-9a-f]{40}$/.test(cleanAddress)) {
            return null;
        }

        const data = "0x70a08231" + cleanAddress.padStart(64, "0");

        const response = await fetch(NOVET_POLYGON_RPC_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [
                    {
                        to: NOVET_NVT_CONTRACT_ADDRESS,
                        data
                    },
                    "latest"
                ]
            })
        });

        const result = await response.json();

        if (!result || !result.result) {
            return null;
        }

        const raw = BigInt(result.result);
        const divisor = 1000000000000000000n;

        const whole = raw / divisor;
        const fraction = raw % divisor;

        const fractionText = fraction
            .toString()
            .padStart(18, "0")
            .slice(0, 6)
            .replace(/0+$/, "");

        const displayText = fractionText
            ? `${whole.toString()}.${fractionText}`
            : whole.toString();

        return Number(displayText);
    } catch (err) {
        console.error("NVTオンチェーン残高取得エラー:", err);
        return null;
    }
}

function formatNovetNvt(value) {
    const num = Number(value || 0);

    return num.toLocaleString("ja-JP", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
    });
}

function getNovetRelativePortalPath(pageName) {
    const path = window.location.pathname;

    if (path.includes("/portal/")) {
        return pageName;
    }

    return `../portal/${pageName}`;
}

function getNovetRelativeMySitePath(pageName) {
    const path = window.location.pathname;

    if (path.includes("/portal/")) {
        return `../my-site/${pageName}`;
    }

    return pageName;
}

// =====================================================
// 共通右パネル描画
// 対象：id="rightPanel" があるページ
// =====================================================

async function renderNovetSharedRightPanel() {
    const panel = document.getElementById("rightPanel");
    if (!panel) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        if (!user) {
            panel.innerHTML = `
                <h3>ゲストさん</h3>
                <p style="font-size:12px; color:#666; margin-bottom:15px;">
                    Googleアカウントでログインすると執筆や報酬の受け取りが可能です。
                </p>
                <a href="${getNovetRelativePortalPath("login.html")}" class="right-btn" style="background:#4285F4; display:block; text-align:center; color:white; padding:10px; text-decoration:none; border-radius:5px;">
                    Googleでログイン
                </a>
            `;
            return;
        }

        const { data: profile, error: profileError } = await window.supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError || !profile) {
            console.error("プロフィール取得エラー:", profileError);
            panel.innerHTML = `
                <h3>ゲストさん</h3>
                <p style="font-size:12px; color:#666;">プロフィールを読み込めませんでした。</p>
            `;
            return;
        }

        if (profile.is_frozen) {
            window.location.replace(getNovetRelativeMySitePath("penalty.html"));
            return;
        }

        const walletAddress =
            profile.dynamic_wallet_address ||
            profile.wallet_address ||
            "";

        let displayNvt = Number(profile.nvt_balance || 0);

        const onchainNvt = await fetchNovetOnchainNvtBalance(walletAddress);
        if (onchainNvt !== null) {
            displayNvt = onchainNvt;
        }

        const { data: myNovels } = await window.supabaseClient
            .from("novels")
            .select("char_count")
            .eq("user_id", user.id)
            .eq("published", true);

        const workCount = myNovels ? myNovels.length : 0;
        const totalChars = myNovels
            ? myNovels.reduce((sum, n) => sum + (n.char_count || 0), 0)
            : 0;

        panel.innerHTML = `
            <h3 style="border-bottom: 2px solid #6a0dad; padding-bottom: 5px; margin-bottom: 15px;">
                マイステータス
            </h3>

            <p style="font-size:13px; margin-bottom:10px;">
                <b>👤 アカウント：</b><br>${profile.username || "名称未設定"}
            </p>

            <a href="${getNovetRelativePortalPath("wallet.html")}" style="text-decoration: none; color: inherit; display: block;">
                <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:15px; border:1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#f9f9f9'">
                    <p style="font-size:11px; color:#666; margin-bottom:5px;">
                        保有資産 <span style="color:#6a0dad; font-weight:bold;">(クリックでウォレットへ)</span>
                    </p>

                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="font-size:13px; font-weight:bold; color:#6a0dad;">💎 NVT (報酬)</span>
                        <span style="font-size:13px; font-weight:bold;">${formatNovetNvt(displayNvt)}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-size:13px; font-weight:bold; color:#ff8c00;">💰 NP (ポイント)</span>
                        <span style="font-size:13px; font-weight:bold;">${Math.floor(profile.np_balance || 0).toLocaleString()}</span>
                    </div>
                </div>
            </a>

            <div style="font-size:12px; color:#444; border-top:1px solid #eee; padding-top:10px;">
                <p><b>作品数：</b>${workCount} 作品</p>
                <p><b>累計文字数：</b>${totalChars.toLocaleString()} 字</p>
            </div>

            <a href="${getNovetRelativePortalPath("account.html")}" class="right-btn" style="display:block; text-align:center; background:#6a0dad; color:white; padding:8px; text-decoration:none; border-radius:5px; margin-top:15px;">
                マイページ / お財布
            </a>

            <a href="${getNovetRelativeMySitePath("author.html")}" class="right-btn" style="display:block; text-align:center; background:#ff9800; color:white; padding:8px; text-decoration:none; border-radius:5px; margin-top:10px;">
                🖋️ 作家管理へ
            </a>

            <button onclick="handleLogout()" style="background:none; border:none; color:#999; text-decoration:underline; font-size:11px; cursor:pointer; width:100%; margin-top:10px;">
                ログアウト
            </button>
        `;
    } catch (err) {
        console.error("右パネル描画エラー:", err);
    }
}

window.renderNovetSharedRightPanel = renderNovetSharedRightPanel;

window.addEventListener("load", async () => {
    await renderNovetSharedRightPanel();
});

// =====================================================
// ログアウト処理
// =====================================================

async function handleLogout() {
    try {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }

        if (window.web3auth && window.web3auth.connected) {
            await window.web3auth.logout();
        }
    } catch (err) {
        console.error("サインアウト中にエラー:", err);
    } finally {
        localStorage.clear();

const path = window.location.pathname;

// ログアウト後は必ず全年齢側トップ（my-site/index.html）へ戻す
if (path.includes("/portal/")) {
    window.location.href = "../my-site/index.html";
} else if (
    path.includes("/my-siteman/") ||
    path.includes("/my-sitewomens/")
) {
    window.location.href = "../my-site/index.html";
} else {
    window.location.href = "index.html";
}
    }
}

window.handleLogout = handleLogout;