import { setupControl } from "./control";
import { getAuth, getServerUrl, jellyfin } from "./jellyfin_helper";

export function checkAuthStored(){
  return getAuth() != null && getServerUrl() != null;
}

export function setupAuth(element: HTMLElement) {
  let serverURL = "", username = "", password = "";
  const serverURLElement = document.createElement('input');
  serverURLElement.type = 'text';
  serverURLElement.placeholder = 'Server URL';
  serverURLElement.addEventListener('change', (ev: any) => {
    serverURL = ev.target["value"];
  });
  element.appendChild(serverURLElement);

  const usernameElement = document.createElement('input');
  usernameElement.type = 'text';
  usernameElement.placeholder = 'Username';
  usernameElement.addEventListener('change', (ev: any) => {
    username = ev.target["value"];
  });
  element.appendChild(usernameElement);

  const passwordElement = document.createElement('input');
  passwordElement.type = 'password';
  passwordElement.placeholder = 'Password';
  passwordElement.addEventListener('change', (ev: any) => {
    password = ev.target["value"];
  });
  element.appendChild(passwordElement);

  // validate
  const validateButton = document.createElement('button');
  validateButton.innerText = 'Validate';
  validateButton.addEventListener('click', async (ev: any) => {
    if (serverURL && username && password) {
      const api = jellyfin.createApi(serverURL);
      const auth = await api.authenticateUserByName(username, password);
      if(typeof auth.data.AccessToken  == "string"){
        localStorage.setItem('server-url', serverURL);
        localStorage.setItem('api-key', auth.data.AccessToken);
        // alert("Successfully authenticated");
        validateButton.innerText = "Successfully authenticated!";
        // switch
        location.reload();
      }else{
        // alert("Invalid credentials");
        validateButton.innerText = "Invalid credentials!";
        return;
      }
    }
  });
  element.appendChild(validateButton);
}
