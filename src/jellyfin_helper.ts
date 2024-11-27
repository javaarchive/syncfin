import { Jellyfin } from "@jellyfin/sdk";
import type { Api } from "@jellyfin/sdk";

export function getPerDeviceRandID(): string{
    if(typeof localStorage.getItem('device-id') == "string"){
        return (localStorage.getItem('device-id') as string);
    }
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('device-id', id);
    return id;
}

export function getServerUrl(){
    return localStorage.getItem('server-url');
}
  
export function getAuth(){
    return localStorage.getItem('api-key');
}

export const jellyfin = new Jellyfin({
    clientInfo: {
        name: 'Syncfin',
        version: '1.0.0'
    },
    deviceInfo: {
        name: 'Syncfin Instance on ' + navigator.userAgent,
        id: getPerDeviceRandID()
    }
});

let globalApi: Api | null = null;

export function getApi(): Api {
    if(globalApi == null){
        globalApi = jellyfin.createApi(getServerUrl() as string, localStorage.getItem('api-key') as string); // this can be null and it'll be unauthenticxated
    }
    return globalApi;
}