import axios, { AxiosInstance } from 'axios';
import { IBSAFEAuth } from './auth/types';
import { defaultConfigurable } from '../../configurables';
export class Api {
    public client: AxiosInstance;

    constructor(auth: IBSAFEAuth) {
        this.client = axios.create({
            baseURL: defaultConfigurable.api_url,
            headers: {
                Authorization: auth.token,
                Signeraddress: auth.address
            }
        });
    }
}
