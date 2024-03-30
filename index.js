const {
  app,
  BrowserWindow,
  ipcMain,
  autoUpdater,
  dialog
} = require('electron');
const DiscordRPC = require('discord-rpc');
const ws = require('windows-shortcuts');
const os = require('os')
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'settings.json'))) {
  fs.writeFileSync(path.join(__dirname, 'settings.json'),
    JSON.stringify({
      DesktopShortcutPlaced: false
    }, null, 4));
}

const configFile = fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8');
const data = JSON.parse(configFile);

if (data.DesktopShortcutPlaced === false) {
  if (fs.existsSync(path.join(os.homedir(), "Desktop", "OSFR Launcher.lnk"))) {
    fs.unlinkSync(path.join(os.homedir(), "Desktop", "OSFR Launcher.lnk"));
  }
  ws.create(path.join(os.homedir(), "Desktop", "OSFR Launcher.lnk"), {
    target: path.join(__dirname, "../../OSFRLauncher.exe"),
    desc: "A Launcher For Open-Source-Free-Realms",
    icon: path.join(__dirname, "../../resources/app/src/www/img/icon.ico"),
    admin: false,
    workingDir: path.join(__dirname, "../../"),
  }, (err) => {
    if (err) console.log(err);
  });
  data.DesktopShortcutPlaced = true;
}

fs.writeFileSync(path.join(__dirname, 'settings.json'), JSON.stringify(data, null, 4));
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
      ELECTRON_DISABLE_SECURITY_WARNINGS: true,
    },
    resizable: true,
    backgroundColor: '#161b22',
  });
  win.loadFile('./src/www/index.html')
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
    console.clear();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('close', () => {
  app.quit();
});

ipcMain.on('restart', () => {
  app.relaunch();
  app.exit();
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

const clientId = '1223728876199608410';
DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({
  transport: 'ipc'
});
const startTimestamp = new Date();
async function setActivity() {
  if (!rpc || !win) {
    return;
  }

  rpc.setActivity({
    details: `Hanging out in the Launcher`,
    startTimestamp,
    largeImageKey: 'osfr',
    instance: false,
  });
}

rpc.on('ready', () => {
  setActivity();

  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpc.login({
  clientId
}).catch(console.error);