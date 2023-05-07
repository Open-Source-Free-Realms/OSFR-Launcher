const { app, BrowserWindow, ipcMain } = require('electron');
const DiscordRPC = require('discord-rpc');
const crash = (err) => { console.error(`\x1b[31m${err}\x1b[0m`); process.exit(1); };
const ws = require('windows-shortcuts');
const os = require('os')
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'config.json'))) {
    fs.writeFileSync(path.join(__dirname, 'config.json'),
        JSON.stringify({
            DesktopShortcutPlaced: false,
        }, null, 4));
}

const configFile = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
const data = JSON.parse(configFile);

if (data.DesktopShortcutPlaced === false) {
    ws.create(path.join(os.homedir(), "Desktop", "OSFR Launcher.lnk"), {
        target: path.join(__dirname, "../../FreeRealmsLauncher.exe"),
        desc: "A Free Realms launcher made by Lillious for the OSFR community",
        icon: path.join(__dirname, "../../resources/app/src/www/img/icon.ico"),
        admin: false,
    }, (err) => {
        if (err) console.log(err);
    });
    data.DesktopShortcutPlaced = true;
}

fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(data, null, 4));

let win;
const createWindow = () => {
    win = new BrowserWindow({
        width: 900,
        minWidth: 900,
        height: 600,
        minHeight: 600,
        frame: false,
        darkTheme: true,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
            sandbox: false,
            spellcheck: false,
        },
        resizable: false,
    });
    win.loadFile('./src/www/index.html')
    .catch((err) => { crash(err); });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
})
.catch((err) => { crash(err); });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('close', () => {
    app.quit();
});

ipcMain.on('minimize', () => {
    BrowserWindow.getAllWindows()[0].minimize();
});

ipcMain.on('maximize', () => {
    if (BrowserWindow.getAllWindows()[0].isMaximized()) {
        BrowserWindow.getAllWindows()[0].unmaximize();
    } else {
        BrowserWindow.getAllWindows()[0].maximize();
    }
});

const clientId = '1104553583816474744';

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const startTimestamp = new Date();

async function setActivity() {
  if (!rpc || !win) {
    return;
  }

  rpc.setActivity({
    details: `Hanging out in the launcher`,
    startTimestamp,
    largeImageKey: 'ofsr',
    smallImageKey: 'ofsr',
    instance: false,
  });
}

rpc.on('ready', () => {
  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpc.login({ clientId }).catch(console.error);