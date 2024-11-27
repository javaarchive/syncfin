import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { checkAuthStored, setupAuth } from './signin.ts'
// import {  } from '@jellyfin/sdk/'; 
import {utils} from "@jellyfin/sdk"
import { setupControl } from './control.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = ``;

if(!checkAuthStored()){
  setupAuth(document.querySelector<HTMLElement>('#app')!)
}else{
  setupControl(document.querySelector<HTMLElement>('#app')!)
}