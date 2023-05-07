const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const request = require('request');
const extract = require('extract-zip');
const { exec } = require('child_process');
const crypto = require('crypto');
const close = document.getElementById('close');
const minimize = document.getElementById('minimize');
const maximize = document.getElementById('maximize');
close.addEventListener('click', () => {
    exec('taskkill /IM OSFRServer.exe /F', (err, stdout, stderr) => {
        if (err) {
            Notification.show('error', 'Failed to stop server');
        }
        Notification.show('success', 'Server stopped');
        ipcRenderer.send('close');
    });
});
minimize.addEventListener('click', () => { ipcRenderer.send('minimize'); });
maximize.addEventListener('click', () => { ipcRenderer.send('maximize'); });
const playbtn = document.getElementById('play');
const serverbtn = document.getElementById('server');
const installbtn = document.getElementById('install');
const reinstallbtn = document.getElementById('reinstall');
const uninstallbtn = document.getElementById('uninstall');
const clearConsole = document.getElementById('clearconsole');
const settingsbtn = document.getElementById('settings');
const progressBarContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const consoleContainer = document.getElementById('console');
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

// Check if client or server is installed
if (fs.existsSync(path.join(__dirname, '..', '..', 'Server') || path.join(__dirname, '..', '..', 'Client'))) {
    installbtn.disabled = true;
    serverbtn.disabled = false;
    playbtn.disabled = false;
    reinstallbtn.disabled = false;
    uninstallbtn.disabled = false;
} else {
    installbtn.disabled = false;
    reinstallbtn.disabled = true;
    uninstallbtn.disabled = true;
}

function disableAll() {
    installbtn.disabled = true;
    reinstallbtn.disabled = true;
    uninstallbtn.disabled = true;
}

// Check if server is running
function checkServer() {
    return new Promise((resolve, reject) => {
        exec('tasklist', (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            if (stdout.includes('OSFRServer.exe')) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

// Check if client is running
function checkClient() {
    return new Promise((resolve, reject) => {
        exec('tasklist', (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            if (stdout.includes('FreeRealms.exe')) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}


CheckRunning();

function CheckRunning () {
    checkServer().then((running) => {
        if (running) {
            serverbtn.innerText = 'Stop Server';
            serverbtn.style.color = '#ed6a5e';
            consoleContainer.style.display = 'block';
            reinstallbtn.disabled = true;
            uninstallbtn.disabled = true;
        } else {
            serverbtn.innerText = 'Start Server';
            serverbtn.style.color = '#dcdcdc';
            if (progressBarContainer.style.display != 'block') {
                if (fs.existsSync(path.join(__dirname, '..', '..', 'Server') || path.join(__dirname, '..', '..', 'Client'))) {
                    reinstallbtn.disabled = false;
                    uninstallbtn.disabled = false;
                }
            }
        }
    }).catch((err) => {
        if (err) {
            console.error(err);
        }
    });

    checkClient().then((running) => {
        if (running) {
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
    CheckRunning();
}, 1000);

const Notification = {
    show(mode, message) {
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

function log(mode, message) {
    if (!fs.existsSync(path.join(__dirname, '..', '..', 'logs'))) {
        fs.mkdirSync(path.join(__dirname, '..', '..', 'logs'), { recursive: true });
    }

    fs.appendFileSync(path.join(__dirname, '..', '..', 'logs/log.txt'), `${new Date().toLocaleString()} [${mode.toUpperCase()}] ${message}\n`, (err) => {
        if (err) {
            console.error(err);
        }
    });
}

// Porgress bar controls
const ProgressBar = {
    show() {
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
    if (!options) return;
    Notification.show('information', 'Download started');
    try {
        if (!fs.existsSync(options.temp)) {
            fs.mkdirSync(options.temp, { recursive: true });
        }
    } catch (err) {
        console.error(err);
    }
    var received_bytes = 0;
    var total_bytes = 0;
    var outStream = fs.createWriteStream(`${options.temp}/${options.fileName}`);
    return new Promise((resolve, reject) => {
        request
            .get(options.url)
            .on('error', function(err) {
                console.log(err);
                reject(err);
            })
            .on('response', function(data) {
                total_bytes = parseInt(data.headers['content-length']);
            })
            .on('data', function(chunk) {
                received_bytes += chunk.length;
                showDownloadingProgress(received_bytes, total_bytes);
            })
            .on('end', function() {
                resolve();
            })
            .pipe(outStream);
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

installbtn.addEventListener('click', async () => {
    install();
});

reinstallbtn.addEventListener('click', async () => {
    reinstall();
});


uninstallbtn.addEventListener('click', async () => {
    uninstall();
});

function install () {
    if (fs.existsSync(path.join(__dirname, '..', '..', 'Server') || path.join(__dirname, '..', '..', 'Client'))) {
        Notification.show('error', 'An installation already exists');
        installbtn.disabled = true;
        return;
    }
    disableAll();
    // Download server files
    download({
        url: 'https://files.lilliousnetworks.com/Server.zip',
        fileName: 'Server.zip',
        temp: './temp_server'
    }).then(() => {
        Notification.show('success', 'Server download complete');
        Notification.show('information', 'Extracting Server files');
        File.extract('./temp_server/Server.zip', path.join(__dirname, '..', '..'))
        .then(() => {
            Notification.show('success', 'Extraction complete');
        }).catch((err) => {
            if (err) {
                Notification.show('error', 'Failed to extract server files');
            }
        }).finally(() => {
            fs.rm('./temp_server', { recursive: true, force: true }, (err) => {
                if (err) {
                    Notification.show('error', 'Failed to remove temporary files');
                }
            });
            serverbtn.disabled = false;
        });
    }).catch((err) => {
        if (err) {
            Notification.show('error', 'Failed to download server files');
        }
    }).finally(() => {
        // Download client files
        download({
            url: 'https://files.lilliousnetworks.com/Client.zip',
            fileName: './Client.zip',
            temp: './temp_client'
        }).then(() => {
            Notification.show('success', 'Client download complete');
            Notification.show('information', 'Extracting client files');
            File.extract('./temp_client/Client.zip', path.join(__dirname, '..', '..'))
            .then(() => {
                Notification.show('success', 'Extraction complete');
            }).catch((err) => {
                if (err) {
                    Notification.show('error', 'Failed to extract client files');
                }
            }).finally(() => {
                fs.rm('./temp_client', { recursive: true, force: true }, (err) => {
                    if (err) {
                        Notification.show('error', 'Failed to remove temporary files');
                    }
                });
                playbtn.disabled = false;
                reinstallbtn.disabled = false;
                uninstallbtn.disabled = false;
            });
        }).catch((err) => {
            if (err) {
                Notification.show('error', 'Failed to download client files');
            }
        });
    });
}

function reinstall () {
    uninstall().then(() => {
        install();
    }).catch((err) => {
        if (err) {
            console.log(err);
        }
    });
}

function uninstall () {
    return new Promise((resolve, reject) => {
        disableAll();
        fs.rm(path.join(__dirname, '..', '..', 'Server'), { recursive: true, force: true }, (err) => {
            if (err) {
                Notification.show('error', 'Failed to uninstall');
                reject(err);
            }
            fs.rm(path.join(__dirname, '..', '..', 'Client'), { recursive: true, force: true }, (err) => {
                if (err) {
                    Notification.show('error', 'Failed to uninstall');
                    reject(err);
                }
                Notification.show('success', 'Uninstall complete');
                installbtn.disabled = false;
                playbtn.disabled = true;
                serverbtn.disabled = true;
                resolve();
            });
        });
       
    });
}

serverbtn.addEventListener('click', () => {
    if (serverbtn.innerText == 'Start Server') {
        const process = exec('OSFRServer.exe', {
            cwd: path.join(__dirname, '..', '..', 'Server')
        }, (err, stdout, stderr) => {});
        process.stderr.on('data', (data) => {
            console.log(data);
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
            console.log(err);
        });
    } else if (serverbtn.innerText == 'Stop Server') {
        exec('taskkill /IM OSFRServer.exe /F', (err, stdout, stderr) => {
            if (err) {
                Notification.show('error', 'Failed to stop server');
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
    var server = document.getElementById('serverip').value || '127.0.0.1:20260';
    if (!username) return Notification.show('error', 'Please enter a username');
    const args = `inifile=ClientConfig.ini Guid=${guid} Internationalization:Locale=8 ShowMemberLoadingScreen=0 Country=US key=m80HqsRO9i4PjJSCOasVMg== CasSessionId=Jk6TeiRMc4Ba38NO`
    const process = exec(`FreeRealms.exe ${args} Server=${server} Ticket=${username}`, {
        cwd: path.join(__dirname, '..', '..', 'Client')
    }, (err, stdout, stderr) => {
        if (err) {
            console.log(err);
        }
    });
    process.stderr.on('data', (data) => {
        console.log(data);
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
    c.addEventListener("click", function(e) {
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
  a.addEventListener("click", function(e) {
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
    if (fs.existsSync(path.join(__dirname, '..', '..', 'Server/Customize/PacketSendSelfToClient/Fallback.json'))) {
        exec(`notepad ${path.join(__dirname, '..', '..', 'Server/Customize/PacketSendSelfToClient/Fallback.json')}`, (err, stdout, stderr) => {
            if (err) {
                Notification.show('error', `Failed to open Fallback.json`);
            }
        });
    }
});