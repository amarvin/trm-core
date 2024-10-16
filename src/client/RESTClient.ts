import * as components from "./components";
import * as struct from "./struct";
import { IClient } from "./IClient";
import { getAxiosInstance, normalize } from "../commons";
import { AxiosInstance } from "axios";
import { Login } from "../systemConnector";
import * as FormData from "form-data";

const AXIOS_CTX = "RestServer";

export class RESTClient implements IClient {
    private _axiosInstance: AxiosInstance;
    private _connected: boolean = false;

    constructor(public endpoint: string, public rfcdest: components.RFCDEST, private _login: Login) {
        this.endpoint = this.endpoint.trim();
        this._axiosInstance = getAxiosInstance({
            baseURL: this.endpoint,
            auth: {
                username: this._login.user,
                password: this._login.passwd
            },
            timeout: 10000, //default timeout
        }, AXIOS_CTX);
    }

    public async open() {
        if (!this._connected) {
            const response = await this._axiosInstance.get('/', {
                timeout: 3000
            });
            if (response.status !== 200) {
                throw new Error(`Couldn't reach ${this.endpoint}!`);
            } else {
                this._connected = true;
            }
        }
    }

    public async checkConnection(): Promise<boolean> {
        return this._connected;
    }

    public async readTable(tableName: components.TABNAME, fields: struct.RFC_DB_FLD[], options?: string): Promise<any[]> {
        var sqlOutput = [];
        const delimiter = '|';
        var aOptions: struct.RFC_DB_OPT[] = [];
        if (options) {
            //line must not exceede 72 chars length
            //it must not break on an operator
            const aSplit = options.split(/\s+AND\s+/);
            if (aSplit.length > 1) {
                aSplit.forEach((s, i) => {
                    var sText = s.trim();
                    if (i !== 0) {
                        sText = `AND ${sText}`;
                    }
                    aOptions.push({ text: sText });
                })
            } else {
                aOptions = aSplit.map(s => {
                    return {
                        text: s
                    }
                });
            }
            /*aOptions = (options.match(/.{1,72}/g)).map(s => {
                return {
                    text: s
                }
            }) || [];*/
        }
        const result = await this._axiosInstance.get('/read_table', {
            params: {
                rfcdest: this.rfcdest
            },
            data: {
                query_table: tableName.toUpperCase(),
                delimiter,
                options: aOptions,
                fields: fields
            }
        });
        const data: struct.TAB512[] = result.data;
        data.forEach(tab512 => {
            var sqlLine: any = {};
            const waSplit = tab512.wa.split(delimiter);
            fields.forEach((field, index) => {
                sqlLine[field.fieldName] = waSplit[index].trim();
            });
            sqlOutput.push(sqlLine);
        })
        return normalize(sqlOutput);
    }

    public async getFileSystem(): Promise<struct.FILESYS> {
        const result = (await this._axiosInstance.get('/get_file_sys')).data;
        return result.fileSys;
    }

    public async getDirTrans(): Promise<components.PFEVALUE> {
        const result = (await this._axiosInstance.get('/get_dir_trans')).data;
        return result.dirTrans;
    }

    public async getBinaryFile(filePath: string): Promise<Buffer> {
        const result = (await this._axiosInstance.get('/get_binary_file', {
            responseType: 'arraybuffer',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            data: {
                file_path: filePath
            }
        })).data;
        return result;
    }

    public async writeBinaryFile(filePath: string, binary: Buffer): Promise<void> {
        const formData = new FormData.default();
        var filename: string;
        try{
            filename = /[^\\\/]+$/gmi.exec(filePath)[0];
        }catch(e){
            filename = 'UNKNOWN_FILENAME';
        }
        formData.append('file', binary, filename);
        formData.append('file_path', filePath,);
        await this._axiosInstance.post('/write_binary_file', formData, {
            headers: formData.getHeaders()
        });
    }

    public async createTocTransport(text: components.AS4TEXT, target: components.TR_TARGET): Promise<components.TRKORR> {
        const result = (await this._axiosInstance.post('/create_toc', {
            text: text,
            target: target.trim().toUpperCase()
        })).data;
        return result.trkorr;
    }

    public async createWbTransport(text: components.AS4TEXT, target?: components.TR_TARGET): Promise<components.TRKORR> {
        const result = (await this._axiosInstance.post('/create_import_tr', {
            text: text,
            target: target.trim().toUpperCase()
        })).data;
        return result.trkorr;
    }

    public async setTransportDoc(trkorr: components.TRKORR, doc: struct.TLINE[]): Promise<void> {
        await this._axiosInstance.put('/set_transport_doc', {
            trkorr: trkorr.trim().toUpperCase(),
            doc: doc
        });
    }

    public async getDevclassObjects(devclass: components.DEVCLASS): Promise<struct.TADIR[]> {
        const result = (await this._axiosInstance.get('/get_devclass_objs', {
            data: {
                devclass: devclass.trim().toUpperCase()
            }
        })).data;
        return result.tadir;
    }

    public async addToTransportRequest(trkorr: components.TRKORR, content: struct.E071[], lock: boolean): Promise<void> {
        await this._axiosInstance.put('/add_objs_tr', {
            lock: lock ? 'X' : ' ',
            trkorr: trkorr.trim().toUpperCase(),
            e071: content.map(o => {
                return {
                    pgmid: o.pgmid,
                    object: o.object,
                    obj_name: o.objName
                }
            })
        });
    }

    public async repositoryEnvironment(objectType: components.SEU_OBJ, objectName: components.SOBJ_NAME): Promise<struct.SENVI[]> {
        const result = (await this._axiosInstance.get('/repository_environment', {
            params: {
                rfcdest: this.rfcdest
            },
            data: {
                obj_type: objectType.trim().toUpperCase(),
                object_name: objectName.trim().toUpperCase()
            }
        })).data;
        return result.environmentTab;
    }

    public async deleteTrkorr(trkorr: components.TRKORR): Promise<void> {
        await this._axiosInstance.delete('/delete_transport', {
            data: {
                trkorr: trkorr.trim().toUpperCase()
            }
        });
    }

    public async releaseTrkorr(trkorr: components.TRKORR, lock: boolean, timeout?: number): Promise<void> {
        await this._axiosInstance.post('/release_tr', {
            trkorr: trkorr.trim().toUpperCase(),
            lock: lock ? 'X' : ' '
        }, {
            timeout: timeout * 1000
        });
    }

    public async addSkipTrkorr(trkorr: components.TRKORR): Promise<void> {
        await this._axiosInstance.put('/add_skip_trkorr', {
            trkorr: trkorr.trim().toUpperCase()
        });
    }

    public async addSrcTrkorr(trkorr: components.TRKORR): Promise<void> {
        await this._axiosInstance.put('/add_src_trkorr', {
            trkorr: trkorr.trim().toUpperCase()
        });
    }

    public async readTmsQueue(target: components.TMSSYSNAM): Promise<struct.STMSIQREQ[]> {
        const result = (await this._axiosInstance.get('/read_tms_queue', {
            data: {
                target: target
            }
        })).data;
        return result.requests;
    }

    public async createPackage(scompkdtln: struct.SCOMPKDTLN): Promise<void> {
        await this._axiosInstance.post('/create_package', scompkdtln);
    }

    public async tdevcInterface(devclass: components.DEVCLASS, parentcl?: components.DEVCLASS, rmParentCl?: boolean): Promise<void> {
        await this._axiosInstance.post('/tdevc_interface', {
            devclass: devclass.trim().toUpperCase(),
            parentcl: parentcl ? parentcl.trim().toUpperCase() : '',
            rm_parentcl: rmParentCl ? 'X' : ' '
        });
    }

    public async getDefaultTransportLayer(): Promise<components.DEVLAYER> {
        const result = (await this._axiosInstance.get('/get_transport_layer')).data;
        return result.layer;
    }

    public async tadirInterface(tadir: struct.TADIR): Promise<void> {
        await this._axiosInstance.post('/tadir_interface', {
            pgmid: tadir.pgmid,
            object: tadir.object,
            obj_name: tadir.objName,
            devclass: tadir.devclass,
            set_genflag: tadir.genflag ? 'X' : ' ',
            srcsystem: tadir.srcsystem
        });
    }

    public async dequeueTransport(trkorr: components.TRKORR): Promise<void> {
        await this._axiosInstance.post('/dequeue_tr', {
            trkorr: trkorr.trim().toUpperCase()
        });
    }

    public async forwardTransport(trkorr: components.TRKORR, target: components.TMSSYSNAM, source: components.TMSSYSNAM, importAgain: boolean = true): Promise<void> {
        await this._axiosInstance.post('/forward_tr', {
            trkorr: trkorr.trim().toUpperCase(),
            target: target.trim().toUpperCase(),
            source: source.trim().toUpperCase(),
            import_again: importAgain ? 'X' : ' '
        });
    }

    public async importTransport(trkorr: components.TRKORR, system: components.TMSSYSNAM): Promise<void> {
        await this._axiosInstance.post('/import_tr', {
            system: system.trim().toUpperCase(),
            trkorr: trkorr.trim().toUpperCase()
        });
    }

    public async setInstallDevc(installDevc: struct.ZTRM_INSTALLDEVC[]): Promise<void> {
        await this._axiosInstance.put('/set_install_devc', {
            installdevc: installDevc
        });
    }

    public async getObjectsList(): Promise<struct.KO100[]> {
        const result = (await this._axiosInstance.get('/list_object_types')).data;
        return result.objectText;
    }

    public async getTrmServerVersion(): Promise<string> {
        const result = (await this._axiosInstance.get('/version')).data;
        return result.version;
    }

    public async trmServerPing(): Promise<string> {
        const result = (await this._axiosInstance.get('/ping')).data;
        return result.return;
    }

    public async renameTransportRequest(trkorr: components.TRKORR, as4text: components.AS4TEXT): Promise<void> {
        await this._axiosInstance.post('/rename_transport_request', {
            trkorr: trkorr.trim().toUpperCase(),
            as4text: as4text
        });
    }

    public async setPackageIntegrity(integrity: struct.ZTRM_INTEGRITY): Promise<void> {
        await this._axiosInstance.put('/set_integrity', {
                integrity: integrity
        });
    }

    public async addTranslationToTr(trkorr: components.TRKORR, devclassFilter: struct.LXE_TT_PACKG_LINE[]): Promise<void> {
        await this._axiosInstance.put('/add_lang_tr', {
            trkorr: trkorr,
            devclass: devclassFilter
        });
    }

    public async trCopy(from: components.TRKORR, to: components.TRKORR, doc: boolean = false): Promise<void> {
        await this._axiosInstance.post('/tr_copy', {
            from: from,
            to: to,
            doc: doc ? 'X' : ' '
        });
    }

    public async getDest(): Promise<string> {
        const result = (await this._axiosInstance.get('/get_dest', {
            params: {
                rfcdest: this.rfcdest
            }
        })).data;
        return result.dest;
    }

    public async getTransportObjectsBulk(trkorr: components.TRKORR): Promise<struct.TADIR[]> {
        const result = (await this._axiosInstance.get('/get_transport_objs_bulk', {
            data: {
                trkorr
            }
        })).data;
        return result.tadir;
    }
}