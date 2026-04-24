import{o as e}from"./chunk-Dlc7tRH4.js";import{Cr as t,Kr as n,M as r,Sr as i,Zr as a,ci as o,dc as s,ii as c,lc as l,qr as u,xr as d}from"./index-hmDiE8R1.js";import{c as f}from"./ModalHeader-ByY2wsBw-Dl0A450G.js";import{t as p}from"./Screen-17GDtJCX-47eYrAcv.js";import{a as m,d as h,n as g,o as _,s as v}from"./shared-DkB_Ojl5-BuVwwXuR.js";import{t as y}from"./ShieldCheckIcon-Dg9wjO5r.js";import{a as b}from"./Layouts-BlFm53ED-BIaLFlxU.js";var x=l(),S=e(s(),1);t();var C={component:()=>{let[e,t]=(0,S.useState)(!0),{authenticated:i,user:s}=u(),{walletProxy:l,closePrivyModal:d,createAnalyticsEvent:f,client:C}=c(),{navigate:D,data:O,onUserCloseViaDialogOrKeybindRef:k}=n(),[A,j]=(0,S.useState)(void 0),[M,N]=(0,S.useState)(``),[P,F]=(0,S.useState)(!1),{entropyId:I,entropyIdVerifier:L,onCompleteNavigateTo:R,onSuccess:z,onFailure:B}=O.recoverWallet,V=(e=`User exited before their wallet could be recovered`)=>{d({shouldCallAuthOnSuccess:!1}),B(typeof e==`string`?new o(e):e)};return k.current=V,(0,S.useEffect)((()=>{if(!i)return V(`User must be authenticated and have a Privy wallet before it can be recovered`)}),[i]),(0,x.jsxs)(p,{children:[(0,x.jsx)(p.Header,{icon:y,title:`Enter your password`,subtitle:`Please provision your account on this new device. To continue, enter your recovery password.`,showClose:!0,onClose:V}),(0,x.jsx)(p.Body,{children:(0,x.jsx)(w,{children:(0,x.jsxs)(`div`,{children:[(0,x.jsxs)(m,{children:[(0,x.jsx)(_,{type:e?`password`:`text`,onChange:e=>(e=>{e&&j(e)})(e.target.value),disabled:P,style:{paddingRight:`2.3rem`}}),(0,x.jsx)(h,{style:{right:`0.75rem`},children:e?(0,x.jsx)(g,{onClick:()=>t(!1)}):(0,x.jsx)(v,{onClick:()=>t(!0)})})]}),!!M&&(0,x.jsx)(T,{children:M})]})})}),(0,x.jsxs)(p.Footer,{children:[(0,x.jsx)(p.HelpText,{children:(0,x.jsxs)(b,{children:[(0,x.jsx)(`h4`,{children:`Why is this necessary?`}),(0,x.jsx)(`p`,{children:`You previously set a password for this wallet. This helps ensure only you can access it`})]})}),(0,x.jsx)(p.Actions,{children:(0,x.jsx)(E,{loading:P||!l,disabled:!A,onClick:async()=>{F(!0);let e=await C.getAccessToken(),t=a(s,I);if(!e||!t||A===null)return V(`User must be authenticated and have a Privy wallet before it can be recovered`);try{f({eventName:`embedded_wallet_recovery_started`,payload:{walletAddress:t.address}}),await l?.recover({accessToken:e,entropyId:I,entropyIdVerifier:L,recoveryPassword:A}),N(``),R?D(R):d({shouldCallAuthOnSuccess:!1}),z?.(t),f({eventName:`embedded_wallet_recovery_completed`,payload:{walletAddress:t.address}})}catch(e){r(e)?N(`Invalid recovery password, please try again.`):N(`An error has occurred, please try again.`)}finally{F(!1)}},$hideAnimations:!I&&P,children:`Recover your account`})}),(0,x.jsx)(p.Watermark,{})]})]})}},w=i.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,T=i.div`
  line-height: 20px;
  height: 20px;
  font-size: 13px;
  color: var(--privy-color-error);
  text-align: left;
  margin-top: 0.5rem;
`,E=i(f)`
  ${({$hideAnimations:e})=>e&&d`
      && {
        // Remove animations because the recoverWallet task on the iframe partially
        // blocks the renderer, so the animation stutters and doesn't look good
        transition: none;
      }
    `}
`;export{C as PasswordRecoveryScreen,C as default};