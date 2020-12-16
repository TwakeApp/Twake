import Observable from './Observable/Observable';

type Rights = 'guest' | 'member' | 'administrator';

class _AccessRightsService extends Observable {
  workspaceLevels: { [workspaceId: string]: Rights } = {};
  companyLevels: { [companyId: string]: Rights } = {};

  constructor() {
    super();
    (window as any).AccessRightsService = this;
  }

  public hasLevel(workspaceId: string, right: 'none' | Rights) {
    return (this.workspaceLevels[workspaceId] || 'none') === right;
  }

  public getLevel(workspaceId: string): 'none' | Rights {
    return this.workspaceLevels[workspaceId] || 'none';
  }

  public updateLevel(workspaceId: string, right: 'none' | Rights) {
    delete this.workspaceLevels[workspaceId];
    if (right !== 'none') this.workspaceLevels[workspaceId] = right;
    this.notify();
  }

  public resetLevels() {
    this.workspaceLevels = {};
    this.companyLevels = {};
    this.notify();
  }

  public updateCompanyLevel(companyId: string, right: 'none' | Rights) {
    delete this.companyLevels[companyId];
    if (right !== 'none') this.companyLevels[companyId] = right;
    this.notify();
  }

  public hasCompanyLevel(companyId: string, right: 'none' | Rights) {
    return (this.companyLevels[companyId] || 'none') === right;
  }

  public getCompanyLevel(companyId: string): 'none' | Rights {
    return this.companyLevels[companyId] || 'none';
  }
}

const AccessRightsService = new _AccessRightsService();
export default AccessRightsService;
