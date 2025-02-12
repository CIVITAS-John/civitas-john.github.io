import { CodeSection } from "../sections/code.js";
import { CodebookSection } from "../sections/codebook.js";
import { DatasetSection } from "../sections/dataset.js";
import { UserSection } from "../sections/user.js";
import { Panel } from "./panel.js";
/** SidePanel: The side panel for the visualizer. */
export class SidePanel extends Panel {
    /** Contents: The content container for the side panel. */
    Contents;
    /** Header: The header of the side panel. */
    Header;
    /** Subpanels: The subpanels in the side panel. */
    Subpanels = {};
    /** Constructor: Constructing the side panel. */
    constructor(Container, Visualizer) {
        super(Container, Visualizer);
        // Add the side panel
        this.Container.find(".collapsable").on("click", () => {
            this.Toggle();
        });
        this.Header = this.Container.find(".panel-header h2");
        this.Contents = this.Container.children(".content");
        // Add the subpanels
        const Sections = [
            new DatasetSection(this.Contents, this.Visualizer),
            new CodebookSection(this.Contents, this.Visualizer),
            new CodeSection(this.Contents, this.Visualizer),
            new UserSection(this.Contents, this.Visualizer),
        ];
        for (const Section of Sections) {
            this.Subpanels[Section.Name] = Section;
        }
        // Add the menu
        const MenuContainer = this.Contents.children(".panel-menu");
        const BuildMenu = (Name) => {
            return $(`<a href="javascript:void(0)" id="menu-${Name}">${this.Subpanels[Name].Name}</a>`).on("click", () => this.ShowPanel(Name));
        };
        for (const Key in this.Subpanels) {
            MenuContainer.append(BuildMenu(Key));
        }
        // Show the tutorial
        MenuContainer.append($('<a href="javascript:void(0)" id="menu-tutorial">?</a>').on("click", () => {
            this.Visualizer.Tutorial.ShowTutorial(true);
        }));
    }
    /** ShowPanel: Show a side panel. */
    ShowPanel(Name) {
        const Panel = this.Subpanels[Name];
        this.Header.text(Panel.Title);
        for (const Key in this.Subpanels) {
            if (Key === Name) {
                this.Subpanels[Key].Show();
            }
            else {
                this.Subpanels[Key].Hide();
            }
        }
        $(`#menu-${this.CurrentPanel}`).toggleClass("chosen", false);
        $(`#menu-${Name}`).toggleClass("chosen", true);
        this.CurrentPanel = Name;
        return Panel;
    }
    /** CurrentPanel: The current panel being shown. */
    CurrentPanel = "Datasets";
    /** Show: Show the side panel. */
    Show() {
        this.Container.toggleClass("collapsed", false);
        this.ShowPanel(this.CurrentPanel);
    }
    /** Hide: Hide the side panel. */
    Hide() {
        this.Container.toggleClass("collapsed", true);
    }
    /** Render: Render the panel. */
    Render() {
        this.Subpanels[this.CurrentPanel].Render();
    }
    /** Toggle: Toggle the side panel. */
    Toggle() {
        if (this.Container.hasClass("collapsed")) {
            this.Show();
        }
        else {
            this.Hide();
        }
    }
}
