
  import {
    createDynamicClient,
    authenticateWithSocial,
    detectOAuthRedirect,
    completeSocialAuthentication,
    isSignedIn,
    waitForClientInitialized,
  } from "@dynamic-labs-sdk/client";

  import {
    createWaasWalletAccounts,
    getChainsMissingWaasWalletAccounts,
  } from "@dynamic-labs-sdk/client/waas";

  import { addEvmExtension } from "@dynamic-labs-sdk/evm";

  if (!window.supabaseClient) {
  throw new Error("Supabase接続が初期化されていません。auth-check.js を確認してください。");
}

const supabaseClient = window.supabaseClient;
  const environmentId = "4ab745f8-fd7f-47c3-9f70-b024af2fc63b";

  const loginBox = document.getElementById("loginBox");
  const resetBox = document.getElementById("resetBox");

  const statusEl = document.getElementById("loginStatus");
  const loginBtn = document.getElementById("googleLoginBtn");

  const resetStatusEl = document.getElementById("resetStatus");
  const resetPasswordBtn = document.getElementById("resetPasswordBtn");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const newPasswordConfirmInput = document.getElementById("newPasswordConfirmInput");

  const client = createDynamicClient({
    environmentId,
    metadata: {
      name: "ノベットコイン.com",
      universalLink: window.location.origin,
    },
  });

  addEvmExtension();

  function setStatus(message) {
    statusEl.innerText = message;
  }

  function setResetStatus(message) {
    resetStatusEl.innerText = message;
  }

  function getRedirectUrl() {
    if (window.location.protocol === "file:") {
      return null;
    }

    return window.location.origin + window.location.pathname;
  }

  function getAfterLoginUrl() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (next && !next.startsWith("http")) {
      return next;
    }

    return "account.html";
  }

  function getEmailFromDynamicUser(user) {
    const verifiedCredentials = user?.verifiedCredentials ?? [];

    return (
      user?.email ||
      user?.oauthEmails?.[0] ||
      verifiedCredentials.map((item) => item?.email).filter(Boolean)[0] ||
      null
    );
  }

  function getEvmWalletCredential(user) {
    const verifiedCredentials = user?.verifiedCredentials ?? [];

    return (
      verifiedCredentials.find(
        (item) =>
          item?.address &&
          (
            item?.chain === "eip155" ||
            item?.walletProvider === "embeddedWallet" ||
            item?.walletName === "dynamicwaas"
          )
      ) ?? null
    );
  }

  function isPasswordRecoveryReturn() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);

    return (
      hash.get("type") === "recovery" ||
      query.get("type") === "recovery" ||
      hash.has("access_token")
    );
  }

  async function handlePasswordRecoveryIfNeeded() {
    if (!isPasswordRecoveryReturn()) return false;

    loginBox.style.display = "none";
    resetBox.style.display = "block";

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setResetStatus("リセット用トークンが見つかりません。もう一度リセットメールを送ってください。");
      return true;
    }

    const { error } = await window.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      setResetStatus("リセット認証に失敗しました: " + error.message);
      return true;
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    setResetStatus("新しいパスワードを入力してください。");
    return true;
  }

  async function createWalletIfNeeded() {
    const missingChains = getChainsMissingWaasWalletAccounts();

    if (missingChains.length > 0) {
      setStatus("サイト内ウォレットを作成中...");
      await createWaasWalletAccounts({ chains: missingChains });
    }
  }

  async function syncDynamicProfile() {
    const user = client.user;
    const email = getEmailFromDynamicUser(user);
    const dynamicUserId = user?.id ?? null;
    const evmWalletCredential = getEvmWalletCredential(user);
    const walletAddress = evmWalletCredential?.address ?? null;

    if (!email || !dynamicUserId || !walletAddress) {
      throw new Error("Dynamicユーザー情報またはウォレット情報が不足しています。");
    }

    const { data: result, error } = await supabaseClient.functions.invoke("sync-dynamic-profile", {
  body: {
    email,
    dynamic_user_id: dynamicUserId,
    dynamic_wallet_address: walletAddress,
  },
});

if (error) {
  throw new Error(error.message || "Supabaseプロフィール同期に失敗しました。");
}

if (!result?.ok) {
  throw new Error(result?.error || "Supabaseプロフィール同期に失敗しました。");
}

    localStorage.setItem("userEmail", email);
    localStorage.setItem("dynamicUserId", dynamicUserId);
    localStorage.setItem("dynamicWalletAddress", walletAddress);

    return {
      email,
      dynamicUserId,
      walletAddress,
      result,
    };
  }

  async function ensureSupabaseAuthSession({ email, dynamicUserId }) {
    const syncPassword = "Nvt!" + dynamicUserId + "2026";

    let authResult = await window.supabaseClient.auth.signInWithPassword({
      email,
      password: syncPassword,
    });

    if (authResult.error) {
      const signUpResult = await window.supabaseClient.auth.signUp({
        email,
        password: syncPassword,
      });

      if (signUpResult.error) {
        throw new Error("Supabase Auth連携失敗: " + signUpResult.error.message);
      }

      authResult = await window.supabaseClient.auth.signInWithPassword({
        email,
        password: syncPassword,
      });
    }

    if (authResult.error) {
      throw new Error("Supabase Authログイン失敗: " + authResult.error.message);
    }

    return authResult.data.user;
  }

  async function completeLoginFlow() {
    await createWalletIfNeeded();

    setStatus("プロフィール同期中...");
    const synced = await syncDynamicProfile();

    setStatus("Supabaseログイン状態を作成中...");
    await ensureSupabaseAuthSession({
      email: synced.email,
      dynamicUserId: synced.dynamicUserId,
    });

    setStatus("ログイン成功。移動します...");

    setTimeout(() => {
      window.location.href = getAfterLoginUrl();
    }, 500);
  }

  async function handleRedirectIfNeeded() {
    try {
      const isRecovery = await handlePasswordRecoveryIfNeeded();
      if (isRecovery) return;

      loginBtn.disabled = true;
      setStatus("Dynamicを初期化中...");

      await waitForClientInitialized();

      const currentUrl = new URL(window.location.href);
      const isReturning = await detectOAuthRedirect({ url: currentUrl });

      if (isReturning) {
        setStatus("Googleログイン完了処理中...");
        await completeSocialAuthentication({ url: currentUrl });

        window.history.replaceState({}, document.title, window.location.pathname);

        await completeLoginFlow();
        return;
      }

      if (isSignedIn() && client.user) {
        setStatus("ログイン済みです。同期中...");
        await completeLoginFlow();
        return;
      }

      setStatus("Googleでログインしてください。");
    } catch (error) {
      console.error("Dynamic login handling error:", error);
      setStatus("ログイン処理エラー: " + (error?.message || String(error)));
    } finally {
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener("click", async () => {
    try {
      const redirectUrl = getRedirectUrl();

      if (!redirectUrl) {
        setStatus("このログインはWeb上のURLで開いてください。file:// ではDynamicログインできません。");
        return;
      }

      loginBtn.disabled = true;
      setStatus("Googleログインへ移動中...");

      await authenticateWithSocial({
        provider: "google",
        redirectUrl,
      });
    } catch (error) {
      console.error("Google login start error:", error);
      setStatus("ログイン開始エラー: " + (error?.message || String(error)));
      loginBtn.disabled = false;
    }
  });

  resetPasswordBtn.addEventListener("click", async () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = newPasswordConfirmInput.value;

    if (!newPassword || !confirmPassword) {
      setResetStatus("パスワードを2回入力してください。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetStatus("パスワードが一致しません。");
      return;
    }

    resetPasswordBtn.disabled = true;
    setResetStatus("パスワードを更新中...");

    try {
      const { error } = await window.supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      await window.supabaseClient.auth.signOut();

      setResetStatus("パスワードを更新しました。ログイン画面へ戻ります。");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      setResetStatus("更新エラー: " + (error?.message || String(error)));
      resetPasswordBtn.disabled = false;
    }
  });

  handleRedirectIfNeeded();
