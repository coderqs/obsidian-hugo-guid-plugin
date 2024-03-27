import { App, Plugin, TFile } from "obsidian";
import { ulid } from "ulid";

function addID(app: App): (f: TFile) => Promise<void> {
    return async function (f: TFile): Promise<void> {
        const key = "slug";
        if (!app.metadataCache.getFileCache(f)?.frontmatter?.[key]) {
            await app.fileManager.processFrontMatter(f, (data) => {
                data[key] = ulid();
            });
        }
    };
}

function isExcluded(fullPath:string){
    const excludePath = ["default", "homepage", "archive", "template"];
    const excludeFile = ["_index.md"];
    const pathSegments = fullPath.split('/');

    let fn = pathSegments.pop();
    if (fn === '') {
        fn = pathSegments.pop();
    }
    if(fn !== undefined && excludeFile.includes(fn)) {
        return true;
    }

    for(let i = 0; i < pathSegments.length; i++) {
        if (excludePath.includes(pathSegments[i]))
            return true;
    }

    return false;
}

function addIDsToAllNotes(app: App) {
    const _addID = addID(app);
    return function () {
        const filelist = app.vault.getMarkdownFiles().forEach(f => {
            if (!isExcluded(f.path)){
                _addID(f);
            }
        });
    };
}

export default class IDPlugin extends Plugin {
    async onload() {
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
