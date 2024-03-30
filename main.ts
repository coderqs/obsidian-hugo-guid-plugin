import { App, Plugin, TFile } from "obsidian";
import { PluginSettingTab, Setting, Notice } from "obsidian";
import { ulid } from "ulid";

let excludePath: string[];
let excludeFile: string[];
let fieldsName: string;

function isExcluded(fullPath:string){
    //const excludePath = ["default", "homepage", "archive", "template"];
    //const excludeFile = ["_index.md"];
    const pathSegments = fullPath.split('/').filter(item => item !== "");

    let fn = pathSegments.pop();
    if(fn !== undefined && excludeFile.includes(fn)) {
        return true;
    }

    for(let i = 0; i < pathSegments.length; i++) {
        if (excludePath.includes(pathSegments[i]))
            return true;
    }

    return false;
}

function addID(app: App): (f: TFile) => Promise<void> {
    return async function (f: TFile): Promise<void> {
        if (isExcluded(f.path)) {
            return;
        }
        const key = fieldsName;
        if (!app.metadataCache.getFileCache(f)?.frontmatter?.[key]) {
            await app.fileManager.processFrontMatter(f, (data) => {
                data[key] = ulid();
            });
        }
    };
}

function addIDsToAllNotes(app: App) {
    const _addID = addID(app);
    return function () {
        const filelist = app.vault.getMarkdownFiles().forEach(f => {
            _addID(f);
        });
    };
}

export default class IDPlugin extends Plugin {
    settings: PluginSettings;

    async loadSettings() {
        this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SettingTab(this.app, this));
        
        excludePath = this.settings.dirsBlacklist.split(",").filter(item => item !== "");
        excludeFile = this.settings.filesBlacklist.split(",").filter(item => item !== "");
        fieldsName = this.settings.fieldsName;
   
        // Called when a file has been indexed, and its (updated) cache is now
        // available.
        this.registerEvent(
            this.app.metadataCache.on("changed", addID(this.app))
        );

        this.addCommand({
            id: "add-ids-to-all-notes",
            name: "Add an ID to all notes",
            callback: addIDsToAllNotes(this.app),
        });
    }
}

export interface PluginSettings {
    fieldsName: string;
    filesBlacklist: string;
    dirsBlacklist: string;
}
export const DEFAULT_SETTINGS: PluginSettings = {
    fieldsName: "id",
    filesBlacklist: "",
    dirsBlacklist: ""
}

export class SettingTab extends PluginSettingTab {
    plugin: IDPlugin;
  
    constructor(app: App, plugin: IDPlugin) {
      super(app, plugin);
      this.plugin = plugin;
    }
  
    display(): void {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Settings" });

        new Setting(containerEl)
        .setName("Fields name")
        .setDesc("The field name of the GUID in the front matter.")
        .addTextArea(textArea =>
          textArea
            .setValue(this.plugin.settings.fieldsName)
            .onChange(async value => {
              this.plugin.settings.fieldsName = value;
              await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Ignored Directory List")
        .setDesc("The directory list ignored.")
        .addTextArea(textArea =>
          textArea
            .setValue(this.plugin.settings.dirsBlacklist)
            .onChange(async value => {
              this.plugin.settings.dirsBlacklist = value;
              await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Ignored Flie List")
        .setDesc("The File list ignored.")
        .addTextArea(textArea =>
          textArea
            .setValue(this.plugin.settings.filesBlacklist)
            .onChange(async value => {
              this.plugin.settings.filesBlacklist = value;
              await this.plugin.saveSettings();
            })
        );
    }
}