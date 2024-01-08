const {
    ipcRenderer
} = require('electron');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const extract = require('extract-zip');
const {
    exec
} = require('child_process');
const close = document.getElementById('close');
const minimize = document.getElementById('minimize');
const maximize = document.getElementById('maximize');
const closejsonprompt = document.getElementById('closejsonprompt');
const opacitywindow = document.getElementById('opacity-window');
const os = require('os');
const package = fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8');
const data = JSON.parse(package);
const version = data.version;
// Busy flag to prevent unwanted actions while the application is busy
var busy = false;

const versionhtml = document.getElementById('version');
versionhtml.innerHTML = `Version ${version}`;

const Notification = {
    show(mode, message, verbose) {
        if (verbose) return log(mode, message);
        log(mode, message);
        const container = document.getElementById('content');
        const NotificationContainer = document.createElement('div');
        const NotificationContent = document.createElement('div');
        NotificationContainer.classList.add('notification-bar');
        NotificationContent.classList.add('notification-content');
        NotificationContent.innerHTML = message;
        NotificationContainer.appendChild(NotificationContent);
        NotificationContainer.style.marginTop = `${50 * document.getElementsByClassName('notification-bar').length}px`;
        switch (mode) {
            case 'success':
                NotificationContainer.style.borderRight = '4px solid #61c555';
                break;
            case 'error':
                NotificationContainer.style.borderRight = '4px solid #ed6a5e';
                break;
            case 'information':
                NotificationContainer.style.borderRight = '4px solid #3f78c4';
                break;
            case 'warn':
                NotificationContainer.style.borderRight = '4px solid #f4c04e';
                break;
            default:
                NotificationContainer.style.borderRight = '4px solid #3f78c4';
                break;
        }
        container.appendChild(NotificationContainer);
        this.clear(NotificationContainer);
    },
    clear(notification) {
        setTimeout(() => {
            const notifications = document.getElementsByClassName('notification-bar');
            for (let i = 0; i < notifications.length; i++) {
                notifications[i].style.marginTop = `${50 * i - 50}px`;
            }
            notification.remove();
        }, 3000);
    }
}



// Prevent abnormal closing of the application
window.addEventListener('keydown', (e) => {
    const {
        key,
        altKey
    } = e;
    if (key === 'F4' && altKey) {
        e.preventDefault();
        Notification.show('warn', 'User attempted to close the application abnormally', true);
    }
});
close.addEventListener('click', () => {
    if (busy) return Notification.show('error', 'Application is busy, please wait');
    exec('taskkill /IM OSFRServer.exe /F', (err, stdout, stderr) => {
        Notification.show('information', 'Application has been closed peacefully', true);
        ipcRenderer.send('close');
    });
});
minimize.addEventListener('click', () => {
    ipcRenderer.send('minimize');
});
maximize.addEventListener('click', () => {
    ipcRenderer.send('maximize');
});
const playbtn = document.getElementById('play');
const serverbtn = document.getElementById('server');
const installbtn = document.getElementById('install');
const reinstallbtn = document.getElementById('reinstall');
const uninstallbtn = document.getElementById('uninstall');
const clearConsole = document.getElementById('clearconsole');
const settingsbtn = document.getElementById('settings');
const logbtn = document.getElementById('logs');
const progressBarContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');

(function () {
    var old = console.log;
    const consoleContent = document.getElementById('console-content');
    console.log = function (message) {
        if (typeof message == 'object') {
            consoleContent.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : message) + '<br />';
        } else {
            consoleContent.innerHTML += message + '<br />';
        }
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }
})();

// Check if server is installed
if (fs.existsSync(path.join(__dirname, '..', '..', 'Server'))) {
    installbtn.disabled = true;
    serverbtn.disabled = false;
    reinstallbtn.disabled = false;
    uninstallbtn.disabled = false;
}

// Check if client is installed
if (fs.existsSync(path.join(__dirname, '..', '..', 'Client'))) {
    installbtn.disabled = true;
    playbtn.disabled = false;
    reinstallbtn.disabled = false;
    uninstallbtn.disabled = false;
}

if (!fs.existsSync(path.join(__dirname, '..', '..', 'Server')) && (!fs.existsSync(path.join(__dirname, '..', '..', 'Client')))) {
    installbtn.disabled = false;
    reinstallbtn.disabled = true;
    uninstallbtn.disabled = true;
}

function disableAll() {
    installbtn.disabled = true;
    reinstallbtn.disabled = true;
    uninstallbtn.disabled = true;
}


function getTaskList() {
    return new Promise((resolve, reject) => {
        exec('tasklist', (err, stdout) => {
            if (err) {
                reject(err);
            }
            resolve(stdout);
        });
    });
}

function CheckRunningTasks() {
    getTaskList().then((stdout) => {
        if (stdout.includes('OSFRServer.exe')) {
            serverbtn.innerText = 'Stop Server';
            serverbtn.style.color = '#ed6a5e';
            reinstallbtn.disabled = true;
            uninstallbtn.disabled = true;
        } else {
            serverbtn.innerText = 'Start Server';
            serverbtn.style.color = '#dcdcdc';
            if (fs.existsSync(path.join(__dirname, '..', '..', 'Server') || path.join(__dirname, '..', '..', 'Client'))) {
                reinstallbtn.disabled = false;
                uninstallbtn.disabled = false;
            }
        }
        if (stdout.includes('FreeRealms.exe')) {
            playbtn.innerText = 'Playing';
            playbtn.style.color = '#3f78c4';
        } else {
            playbtn.innerText = 'Play';
            playbtn.style.color = '#dcdcdc';
        }
    }).catch((err) => {
        if (err) {
            console.error(err);
        }
    });
}

setInterval(() => {
    CheckRunningTasks();
}, 5000);

function log(mode, message) {
    if (!fs.existsSync(path.join(__dirname, '..', '..', 'logs'))) {
        fs.mkdirSync(path.join(__dirname, '..', '..', 'logs'), {
            recursive: true
        });
    }

    fs.appendFileSync(path.join(__dirname, '..', '..', 'logs/log.txt'), `${new Date().toLocaleString()} [${mode.toUpperCase()}] ${message}\n`, (err) => {
        if (err) {
            Notification.show('error', 'Failed to write to log file');
        }
    });
}

// Porgress bar controls
const ProgressBar = {
    show() {
        busy = true;
        progressBarContainer.style.display = 'block';
    },
    hide() {
        progressBarContainer.style.display = 'none';
        progressText.innerText = '';
    },
    update(value) {
        this.show();
        progressBar.style.width = `${parseFloat(value)}%`;
        progressText.innerText = `${parseFloat(value)}%`;
        reinstallbtn.disabled = true;
        uninstallbtn.disabled = true;
        if (value == 100) {
            setTimeout(() => {
                this.hide();
            }, 250);
        }
    }
}

function showDownloadingProgress(received, total) {
    ProgressBar.update(((received * 100) / total).toFixed(1));
}

function download(options) {
    var startTime, endTime;
    return new Promise((resolve, reject) => {
        if (!options) reject('No options provided');

        try {
            if (!fs.existsSync(options.temp)) {
                fs.mkdirSync(options.temp, {
                    recursive: true
                });
            }
        } catch {
            reject('Failed to create temp directory');
        }

        const req = fetch(options.url, {
            method: 'GET',
            encoding: null
        });
        req.then((res) => {
            startTime = new Date().getTime();
            if (res.status !== 200) {
                reject(`Server responded with ${res.status}: ${res.statusText}`);
            }

            const total = res.headers.get('content-length');
            let received = 0;
            const dest = fs.createWriteStream(path.join(options.temp, options.fileName));

            res.body.on('data', (chunk) => {
                received += chunk.length;
                showDownloadingProgress(received, total);
            }).pipe(dest);

            res.body.on('error', (err) => {
                fs.rm(path.join(options.temp), (err) => { });
                reject(err);
            });

            dest.on('finish', () => {
                endTime = new Date().getTime();
                const timeDiff = endTime - startTime;
                const seconds = Math.round(timeDiff / 1000);
                const bytes = fs.statSync(path.join(options.temp, options.fileName)).size;
                const bps = Math.round(bytes / seconds);
                const kbps = Math.round(bps / 1024);
                const mbps = Math.round(kbps / 1024);
                // Check if mbps is infinity
                if (mbps == Infinity) {
                    resolve();
                } else {
                    resolve();
                }
            });

            dest.on('error', (err) => {
                reject(err);
            });
        }).catch((err) => {
            reject(err);
        });
    });
}

const File = {
    async extract(source, target) {
        try {
            await extract(source, {
                dir: target
            })
        } catch (err) {
            throw err;
        }
    }
}


// Check for updates
Notification.show("information", "Checking For Updates");
fetch("https://api.github.com/repos/Open-Source-Free-Realms/OSFR-Launcher/releases/latest")
    .then(res => res.json())
    .then(json => {
        if (json.tag_name !== version) {
            Notification.show("information", "Downloading update");
            download({
                url: json.assets[0].browser_download_url,
                fileName: "update.zip",
                temp: "./temp-update",
            }).then(() => {
                Notification.show("information", "Extracting update");
                busy = true;
                File.extract("./temp-update/update.zip", path.join(__dirname, '..', '..', '..', '..', 'update'))
                    .then(() => {
                        const src = path.join(__dirname, '..', '..', '..', '..', 'update', 'resources', 'app', 'src');
                        const dest = path.join(__dirname, '..', '..', '..', '..', 'resources', 'app', 'src');
                        const packageSrc = path.join(__dirname, '..', '..', '..', '..', 'update', 'resources', 'app', 'package.json');
                        const packageDest = path.join(__dirname, '..', '..', '..', '..', 'resources', 'app', 'package.json');
                        const mainSrc = path.join(__dirname, '..', '..', '..', '..', 'update', 'resources', 'app', 'index.js');
                        const mainDest = path.join(__dirname, '..', '..', '..', '..', 'resources', 'app', 'index.js');
                        const modulesSrc = path.join(__dirname, '..', '..', '..', '..', 'update', 'resources', 'app', 'node_modules');
                        const modulesDest = path.join(__dirname, '..', '..', '..', '..', 'resources', 'app', 'node_modules');
                        try {
                            fse.copySync(src, dest, {
                                overwrite: true
                            });
                        } catch (err) {
                            Notification.show("error", "Failed to copy update");
                        }
                        try {
                            fse.copySync(packageSrc, packageDest, {
                                overwrite: true
                            });
                        } catch (err) {
                            Notification.show("error", "Failed to copy update");
                        }
                        try {
                            fse.copySync(mainSrc, mainDest, {
                                overwrite: true
                            });
                        } catch (err) {
                            Notification.show("error", "Failed to copy update");
                        }
                        try {
                            fse.copySync(modulesSrc, modulesDest, {
                                overwrite: true
                            });
                        } catch (err) {
                            Notification.show("error", "Failed to copy update");
                        }

                        Notification.show("information", "Update complete! Restarting");
                        setTimeout(() => {
                            ipcRenderer.send('restart');
                        }, 3000);
                    }).catch((err) => {
                        Notification.show("error", "Failed to extract update");
                    }).finally(() => {
                        fs.rm(path.join(__dirname, '..', '..', '..', '..', 'update'), {
                            recursive: true,
                            force: true
                        }, (err) => {
                            if (err) {
                                Notification.show("error", "Failed to remove temporary files");
                            }
                        });
                        fs.rm(path.join(__dirname, '..', '..', '..', '..', 'temp-update'), {
                            recursive: true,
                            force: true
                        }, (err) => {
                            if (err) {
                                Notification.show("error", "Failed to remove temporary files");
                            }
                        });
                        busy = false;
                    });
            }).catch((err) => {
                Notification.show("error", "Update download failed");
                busy = false;
                logbtn.disabled = false;
            });
        } else {
            Notification.show("information", "No updates found.");
        }
    });

// Detects if directx9 is installed
installbtn.addEventListener('click', async () => {
    installbtn.disabled = true;
    let System32 = path.join(os.homedir(), '..', '..', 'Windows', 'System32');
    let exists = (fs.existsSync(path.join(System32, 'd3dx9_31.dll')) && fs.existsSync(path.join(System32, 'd3d9.dll')));
    if (!exists) {
        install()
    }
    else
        Notification.show("error", "Missing Directx9");
    directx()
       .then(() => { 
           install();
            }).catch((err) => {
                if (err) {
                    busy = false;
                    Notification.show('error', 'Failed to install DirectX9');
                    installbtn.disabled = false;
                }
            }).finally(() => {
                rm(path.join(os.tmpdir(), 'directx_Jun2010_redist.exe'), {
                    recursive: true,
                    force: true
                }, (err) => {
                    if (err) {
                        Notification.show('error', 'Failed to remove temporary files');
                    }
                });
                rm(path.join(os.tmpdir(), 'directx9'), {
                    recursive: true,
                    force: true
                }, (err) => {
                    if (err) {
                        Notification.show('error', 'Failed to remove temporary files');
                    }
                });
            });
    })
function directx() {
    return new Promise((resolve, reject) => {
        download({
            url: 'https://download.microsoft.com/download/8/4/A/84A35BF1-DAFE-4AE8-82AF-AD2AE20B6B14/directx_Jun2010_redist.exe',
            fileName: 'directx_Jun2010_redist.exe',
            temp: os.tmpdir()
        }).then(() => {
            const args = `/Q /T:`.replace(/\\/g, '/');
            const command = `${os.tmpdir()}/directx_Jun2010_redist.exe ${args}${os.tmpdir()}/directx9`;
            const process = exec(command, {
                cwd: os.tmpdir()
            }, (err) => {
                if (err) {
                    Notification.show('error', err, true);
                    reject(err);
                }
            });

            process.stderr.on('data', (data) => {
                Notification.show('error', data, true);
                reject();
            });

            process.on('exit', (code) => {
                if (code == 0) {
                    const process = exec(`${os.tmpdir()}/directx9/DXSETUP.exe`, {
                        cwd: os.tmpdir()
                    }, (err) => {
                        if (err) {
                            Notification.show('error', err, true);
                            reject(err);
                        }
                    });
                    process.stderr.on('data', (data) => {
                        Notification.show('error', data, true);
                        reject();
                    });
                    process.on('exit', (code) => {
                        if (code == 0) {
                            resolve();
                        } else {
                            Notification.show('error', 'Failed to install DirectX9');
                            reject();
                        }
                    });
                } else {
                    Notification.show('error', 'Failed to install DirectX9');
                    reject();
                }
            });
        });
    });
}

reinstallbtn.addEventListener('click', async () => {
    reinstall();
});


uninstallbtn.addEventListener('click', async () => {
    uninstall().then(() => {
        Notification.show('success', 'Uninstallation complete');
    }).catch((err) => {
        if (err) {
            Notification.show('error', 'Failed to uninstall');
            logbtn.disabled = false;
        }
    }).finally(() => {
        installbtn.disabled = false;
        playbtn.disabled = true;
        serverbtn.disabled = true;
    });
});

function install() {
    busy = true;
    playbtn.disabled = true;
    serverbtn.disabled = true;
    if (fs.existsSync(path.join(__dirname, '..', '..', 'Server') || path.join(__dirname, '..', '..', 'Client'))) {
        Notification.show('information', 'Removing old files');
        fs.rm(path.join(__dirname, '..', '..', 'Server'), {
            recursive: true,
            force: true
        }, (err) => {
            if (err) {
                Notification.show('error', 'Failed to remove old files');
                logbtn.disabled = false;
            }
        });
        fs.rm(path.join(__dirname, '..', '..', 'Client'), {
            recursive: true,
            force: true
        }, (err) => {
            if (err) {
                Notification.show('error', 'Failed to remove old files');
                logbtn.disabled = false;
            }
        });
    }
    disableAll();
    // Downloading server files
    Notification.show('warn', 'Installing Necessary Files');
    download({
        url: 'https://osfr.editz.dev/Server.zip',
        fileName: 'Server.zip',
        temp: `${os.tmpdir()}/OSFRServer`
    }).then(() => {
        busy = true;
        Notification.show('information', 'Extracting Server Files');
        File.extract(`${os.tmpdir()}/OSFRServer/Server.zip`, path.join(__dirname, '..', '..', 'Server'))
            .then(() => {
                Notification.show('success', 'Extraction Complete');
                serverbtn.disabled = true;
            }).then(() => {
                Notification.show('success', 'Server Installation Complete')
            }).catch((err) => {
                if (err) {
                    reinstallbtn.disabled = false;
                    logbtn.disabled = false;
                }
            }).finally(() => {
                fs.rm(path.join(os.tmpdir(), 'OSFRServer'), {
                    recursive: true,
                    force: true
                }, (err) => { });
                busy = false;
            });
    }).catch((err) => {
        if (err) {
            Notification.show('error', err);
            reinstallbtn.disabled = false;
            uninstallbtn.disabled = false;
            logbtn.disabled = false;
            Notification.show('error', 'Failed to download server files');
            ProgressBar.hide();
            busy = false;
        }

    }).finally(() => {
        busy = true;
        // Downloading client files
        download({
            url: 'https://osfr.editz.dev/Client.zip',
            fileName: 'Client.zip',
            temp: `${os.tmpdir()}/OSFRClient`
        }).then(() => {
            busy = true;
            Notification.show('information', 'Extracting Client Files');
            File.extract(`${os.tmpdir()}/OSFRClient/Client.zip`, path.join(__dirname, '..', '..', 'Client'))
                .then(() => {
                    Notification.show('success', 'Extraction Complete');
                }).then(() => {
                    Notification.show('success', 'Client Installation Complete');
                    serverbtn.disabled = false;
                    busy = false;
                }).catch((err) => {
                    if (err) { }
                }).finally(() => {
                    fs.rm(`${os.tmpdir()}/OSFRClient`, {
                        recursive: true,
                        force: true
                    }, (err) => { });
                    playbtn.disabled = false;
                    reinstallbtn.disabled = false;
                    uninstallbtn.disabled = false;
                    logbtn.disabled = false;
                });
        }).catch((err) => {
            if (err) {
                reinstallbtn.disabled = false;
                uninstallbtn.disabled = false;
                logbtn.disabled = false;
                Notification.show('error', 'Failed to download client files');
                ProgressBar.hide();
                busy = false;
            }
        });
    });
}

function reinstall() {
    install();
}

function uninstall() {
    return new Promise((resolve, reject) => {
        disableAll();
        fs.rm(path.join(__dirname, '..', '..', 'Server'), {
            recursive: true,
            force: true
        }, (err) => {
            if (err) {
                reject(err);
            }
        });
        fs.rm(path.join(__dirname, '..', '..', 'Client'), {
            recursive: true,
            force: true
        }, (err) => {
            if (err) {
                reject(err);
            }
        });
        resolve();
    });
}

serverbtn.addEventListener('click', () => {
    if (serverbtn.innerText == 'Start Server') {
        const process = exec('OSFRServer.exe', {
            cwd: path.join(__dirname, '..', '..', 'server/Server')
        }, (err, stdout, stderr) => { });
        process.stderr.on('data', (data) => {
            Notification.show('error', `An error occured, check logs for more information`);
            Notification.show('error', data, true);
            logbtn.disabled = false;
        });
        process.stdout.on('data', (data) => {
            console.log(data);
            if (data.includes('Started listening!')) {
                Notification.show('success', `Server started`);
                return;
            }
            if (data.includes('Login Request')) {
                const ticket = data.match(/Ticket:.*-/g)[0].replace('Ticket:', '').replace('-', '');
                Notification.show('success', `${ticket} has connected`);
            }

            if (data.includes('Attempting to dispose')) {
                // Parse out the username with the prefix 'Attempting to dispose of "' and ending with a double quote
                const ticket = data.match(/Attempting to dispose of ".*"/g)[0].replace('Attempting to dispose of "', '').replace('"', '');
                Notification.show('error', `${ticket} has disconnected`);
            }
            if (data.includes('Invalid configuration!')) {
                Notification.show('error', `Invalid configuration file`);
                process.kill();
                return;
            }
        });
        process.on('error', (err) => {
            Notification.show('error', err, true);
        });
    } else if (serverbtn.innerText == 'Stop Server') {
        exec('taskkill /IM OSFRServer.exe /F', (err, stdout, stderr) => {
            if (err) {
                Notification.show('error', 'Failed to stop server');
                logbtn.disabled = false;
            }
            Notification.show('success', 'Server stopped');
        });
    }
});

clearConsole.addEventListener('click', () => {
    const consoleContent = document.getElementById('console-content');
    consoleContent.innerHTML = '';
    Notification.show('information', 'Console cleared');
});

playbtn.addEventListener('click', () => {
    if (playbtn.innerText != 'Play') return Notification.show('error', 'FreeRealms is already running');
    var username = document.getElementById('username').value;
    var guid = document.getElementById('genderrace').value || 0;
    if (guid == 0) guid = Math.floor(Math.random() * (5 - 2 + 1)) + 2;
    username = username.replace(/\s/g, '');
    username = username.charAt(0).toUpperCase() + username.slice(1);
    var server = document.getElementById('serverip').value || '127.0.0.1';
    if (!username) return Notification.show('error', 'Please enter a username');
    const args = `inifile=ClientConfig.ini Guid=${guid} Internationalization:Locale=8 ShowMemberLoadingScreen=0 Country=US key=m80HqsRO9i4PjJSCOasVMg== CasSessionId=Jk6TeiRMc4Ba38NO`
    const process = exec(`FreeRealms.exe ${args} Server=${server}:20260 Ticket=${username}`, {
        cwd: path.join(__dirname, '..', '..', 'Client/Client')
    }, (err, stdout, stderr) => {
        if (err) {
            Notification.show('error', err, true);
            logbtn.disabled = false;
        }
    });
    process.stderr.on('data', (data) => {
        Notification.show('error', data, true);
    });
    process.stdout.on('data', (data) => {
        console.log(data);
    });
});

var x, i, j, l, ll, selElmnt, a, b, c;
x = document.getElementsByClassName("custom-select");
l = x.length;
for (i = 0; i < l; i++) {
    selElmnt = x[i].getElementsByTagName("select")[0];
    ll = selElmnt.length;
    a = document.createElement("DIV");
    a.setAttribute("class", "select-selected");
    a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
    x[i].appendChild(a);
    b = document.createElement("DIV");
    b.setAttribute("class", "select-items select-hide");
    for (j = 1; j < ll; j++) {

        c = document.createElement("DIV");
        c.innerHTML = selElmnt.options[j].innerHTML;
        c.addEventListener("click", function (e) {
            var y, i, k, s, h, sl, yl;
            s = this.parentNode.parentNode.getElementsByTagName("select")[0];
            sl = s.length;
            h = this.parentNode.previousSibling;
            for (i = 0; i < sl; i++) {
                if (s.options[i].innerHTML == this.innerHTML) {
                    s.selectedIndex = i;
                    h.innerHTML = this.innerHTML;
                    y = this.parentNode.getElementsByClassName("same-as-selected");
                    yl = y.length;
                    for (k = 0; k < yl; k++) {
                        y[k].removeAttribute("class");
                    }
                    this.setAttribute("class", "same-as-selected");
                    break;
                }
            }
            h.click();
        });
        b.appendChild(c);
    }
    x[i].appendChild(b);
    a.addEventListener("click", function (e) {
        e.stopPropagation();
        closeAllSelect(this);
        this.nextSibling.classList.toggle("select-hide");
        this.classList.toggle("select-arrow-active");
    });
}

function closeAllSelect(elmnt) {
    var x, y, i, xl, yl, arrNo = [];
    x = document.getElementsByClassName("select-items");
    y = document.getElementsByClassName("select-selected");
    xl = x.length;
    yl = y.length;
    for (i = 0; i < yl; i++) {
        if (elmnt == y[i]) {
            arrNo.push(i)
        } else {
            y[i].classList.remove("select-arrow-active");
        }
    }
    for (i = 0; i < xl; i++) {
        if (arrNo.indexOf(i)) {
            x[i].classList.add("select-hide");
        }
    }
}
document.addEventListener("click", closeAllSelect);

settingsbtn.addEventListener('click', () => {
    // Clear all item class elements
    const container = document.getElementById('filelist');
    container.innerHTML = '';
    jsonprompt.style.display = 'block';
    opacitywindow.style.display = 'block';
    if (!fs.existsSync(path.join(__dirname, '..', '..', 'Server/Server/Customize/PacketSendSelfToClient/'))) return Notification.show('error', 'No files found');
    const files = fs.readdirSync(path.join(__dirname, '..', '..', 'Server/Server/Customize/PacketSendSelfToClient/'));
    // Filter the files to only include json files
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    if (!jsonFiles.length) return Notification.show('error', 'No files found');
    // Create a list of the json files
    jsonFiles.forEach(file => {
        const item = document.createElement('div');
        item.classList.add('item');
        item.innerText = file;
        item.addEventListener('click', () => {
            exec(`notepad ${path.join(__dirname, '..', '..', 'Server/Server/Customize/PacketSendSelfToClient', file)}`, (err, stdout, stderr) => {
                if (err) {
                    Notification.show('error', `Failed to open ${file}`);
                }
            });
            jsonprompt.style.display = 'none';
            opacitywindow.style.display = 'none';
        });
        container.appendChild(item);
    });
});

closejsonprompt.addEventListener('click', () => {
    jsonprompt.style.display = 'none';
    opacitywindow.style.display = 'none';
});

logbtn.addEventListener('click', () => {
    if (!fs.existsSync(path.join(__dirname, '..', '..', 'logs/'))) return Notification.show('error', 'Unable to locate Log.txt');
    const files = fs.readdirSync(path.join(__dirname, '..', '..', 'logs/'));
    // Filter the files to only include txt files
    const logFiles = files.filter(file => file.endsWith('.txt'));
    if (!logFiles.length) return Notification.show('error', 'No files found');
    // Create a list of the txt files
    logFiles.forEach(file => {
        logbtn.addEventListener('click', () => {
            exec(`notepad ${path.join(__dirname, '..', '..', 'logs', file)}`, (err, stdout, stderr) => {
                if (err) {
                    Notification.show('error', `Failed to open ${file}`);
                }
            });
        })
    })
})