class GurpsSidebar extends Sidebar {
    toggleExpanded(expanded) {
        super.toggleExpanded(expanded);
        GURPS.ModifierBucket.refreshPosition();
    }
    changeTab(tab, group, options) {
        super.changeTab(tab, group, options);
        if (this.expanded) {
            GURPS.ModifierBucket.refreshPosition();
        }
    }
}
export { GurpsSidebar };
