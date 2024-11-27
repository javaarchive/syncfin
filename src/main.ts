import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { checkAuthStored, setupAuth } from './signin.ts'
// import {  } from '@jellyfin/sdk/'; 
import {utils} from "@jellyfin/sdk"

document.querySelector<HTMLDivElement>('#app')!.innerHTML = ``;

if(checkAuthStored()){
  setupAuth(document.querySelector<HTMLElement>('#app')!)
}else{
}