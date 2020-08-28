import React, { Component } from 'react';

import SelectionsManager from 'services/SelectionsManager/SelectionsManager.js';
import DriveService from 'services/Apps/Drive/Drive.js';
import AlertManager from 'services/AlertManager/AlertManager.js';
import MenuManager from 'services/Menus/MenusManager.js';
import Workspaces from 'services/workspaces/workspaces.js';
import Collections from 'services/Collections/Collections.js';
import FilePicker from 'components/Drive/FilePicker/FilePicker.js';
import Button from 'components/Buttons/Button.js';
import Input from 'components/Inputs/Input.js';
import VersionDetails from './VersionDetails.js';
import WorkspacesApps from 'services/workspaces/workspaces_apps.js';
import InputWithClipBoard from 'components/InputWithClipBoard/InputWithClipBoard.js';
import Globals from 'services/Globals.js';
import WorkspaceUserRights from 'services/workspaces/workspace_user_rights.js';
import MediumPopupManager from 'services/mediumPopupManager/mediumPopupManager.js';
import Languages from 'services/languages/languages.js';
import TagPicker from 'components/TagPicker/TagPicker.js';

export default class DriveElement extends React.Component {
  constructor(props) {
    super();
    this.state = {
      selections_manager: SelectionsManager,
    };
    SelectionsManager.addListener(this);

    this.driveCollectionKey = '';

    this.driveSelectorOver = this.driveSelectorOver.bind(this);
    this.driveSelectorOut = this.driveSelectorOut.bind(this);
    Collections.get('drive').addListener(this);
  }
  componentWillUnmount() {
    SelectionsManager.removeListener(this);
    Collections.get('drive').removeListener(this);
    if (this.node) {
      this.node.removeEventListener('drive_selector_over', this.driveSelectorOver);
      this.node.removeEventListener('drive_selector_out', this.driveSelectorOut);
    }

    if (this.driveCollectionKey && this.driveCollectionKey != this.props.driveCollectionKey) {
      console.log('will unmount drive element remove source');
      Collections.get('drive').removeSource(this.driveCollectionKey);
    }
  }
  componentWillMount() {
    if (this.props && this.props.data && this.props.data.front_id) {
      Collections.get('drive').listenOnly(this, [this.props.data.front_id]);
    }

    this.state.element = DriveService.find(
      Workspaces.currentWorkspaceId,
      this.props.data.id,
      el => {
        this.setState({ element: el });
      },
    );
    this.updateMenu();
  }
  componentDidMount() {
    if (this.node) {
      this.node.addEventListener('drive_selector_over', this.driveSelectorOver);
      this.node.addEventListener('drive_selector_out', this.driveSelectorOut);
      this.node.setAttribute('drive_selector_unid', this.state.element.id);
    }

    if (this.props && this.props.data && this.props.data.id) {
      SelectionsManager.listenOnly(this, [this.props.data.id]);
    }
  }
  driveSelectorOut() {
    if (this.state.selected) this.setState({ selected: false });
  }
  driveSelectorOver() {
    if (!this.state.selected) this.setState({ selected: true });
  }

  dropFile(data, directory) {
    var destination = directory || this.props.data;

    var objects = data.data.id;
    if (data.selection_type) {
      var selected = Object.keys(SelectionsManager.selected_per_type[data.selection_type] || {});
      if (selected && selected.length > 1) {
        var objects = selected;
      }
    }

    DriveService.moveFile(
      objects,
      destination,
      this.props.driveCollectionKey || this.driveCollectionKey,
    );
  }

  dragElement(evt) {
    SelectionsManager.setType(this.props.selectionType);
    if (
      !evt.shiftKey &&
      !SelectionsManager.selected_per_type[this.props.selectionType][this.state.element.id]
    ) {
      SelectionsManager.unselectAll();
    }
    SelectionsManager.select(this.state.element.id);
  }

  clickElement(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    if (this.props.notInDrive) {
      if (this.props.onClick) {
        this.props.onClick();
      } else {
        DriveService.viewDocument(this.state.element);
      }
    } else {
      SelectionsManager.setType(this.props.selectionType);
      if (!evt.shiftKey) {
        if (this.props.onClick) {
          this.props.onClick();
        } else {
          DriveService.viewDocument(this.state.element);
        }

        var oldStatus =
          SelectionsManager.selected_per_type[this.props.selectionType][this.state.element.id];
        SelectionsManager.unselectAll();
        if (oldStatus) {
          SelectionsManager.unselect(this.state.element.id);
        } else {
          SelectionsManager.select(this.state.element.id);
        }
      } else {
        SelectionsManager.toggle(this.state.element.id);
      }
    }
  }
  componentWillUpdate(nextProps, nextState) {
    nextState.element =
      Collections.get('drive').find(this.props.data.id) ||
      DriveService.find(Workspaces.currentWorkspaceId, this.props.data.id, el => {
        console.log(el);
        this.setState({ element: el });
      });
    this.state.element = nextState.element;

    if (
      this.state.element &&
      SelectionsManager.selected_per_type[nextProps.selectionType] &&
      SelectionsManager.selected_per_type[nextProps.selectionType][this.state.element.id] !=
        this.old_selection_state
    ) {
      nextState.selected =
        SelectionsManager.selected_per_type[nextProps.selectionType][nextProps.data.id];
      this.old_selection_state = nextState.selected;
    }

    if (this.state.element && !this.props.driveCollectionKey) {
      this.channel = 'standalone_drive_collection_' + this.state.element.parent_id;
      var parent_id = this.state.element.parent_id;
      if (this.state.element.parent_id == 'detached') {
        parent_id += '_' + this.state.element.workspace_id;
      }
      var old_collection_key = this.driveCollectionKey;
      this.driveCollectionKey = DriveService.addSourceIfNotExist(
        Workspaces.currentWorkspaceId,
        this.channel,
        parent_id,
        'standalone',
      );
      if (old_collection_key && old_collection_key != this.driveCollectionKey) {
        console.log('will update drive element remove source');
        Collections.get('drive').removeSource(old_collection_key);
      }
    }

    this.updateMenu();

    return true;
  }

  moveTo(new_parent) {
    DriveService.moveFile(
      [this.state.element.id],
      new_parent,
      this.props.driveCollectionKey || this.driveCollectionKey,
    );
  }

  rename() {
    if (!this.state.element.is_directory) {
      this.state.new_name = this.state.new_name + '.' + this.state.element.extension;
    }
    this.state.element.name = this.state.new_name || this.state.element.name;
    this.state.new_name = undefined;
    MenuManager.closeMenu();
    DriveService.save(this.state.element, this.props.driveCollectionKey || this.driveCollectionKey);
  }

  updateMenu() {
    if (!this.state.element) {
      this.common_menu = [];
      return;
    }

    this.common_menu = [];

    //-- All files
    if (!this.state.element.is_directory) {
      this.common_menu = [
        {
          type: 'menu',
          text: Languages.t('components.drive.elements.see', [], 'Voir'),
          onClick: () => {
            DriveService.viewDocument(this.state.element);
          },
        },
      ];

      var candidates = DriveService.getEditorsCandidates(this.state.element);
      var preview_candidate = candidates.editor_candidate || [];
      var editor_candidate = candidates.preview_candidate || [];

      if (editor_candidate.length > 0 && editor_candidate[0].app) {
        this.common_menu.push({
          type: 'menu',
          text: Languages.t(
            'scenes.apps.drive.viewer.edit_with_button',
            [editor_candidate[0].app.name],
            'Editer avec $1',
          ),
          onClick: () => {
            var app = editor_candidate[0];
            if (app.url && app.is_url_file) {
              window.open(app.url);
            }
            var app = app.app;
            DriveService.getFileUrlForEdition(
              (app.display.drive_module.can_open_files || {}).url,
              app,
              this.state.element.id,
              url => {
                window.open(url);
              },
            );
          },
        });
      }
    }

    this.common_menu.push({
      type: 'menu',
      text:
        this.state.element.url && this.state.element.extension == 'url'
          ? Languages.t('scenes.apps.drive.open_link', [], 'Open link')
          : Languages.t('scenes.apps.drive.download_button', [], 'Télécharger'),
      onClick: () => {
        var link = DriveService.getLink(this.state.element, undefined, 1);
        if (this.state.element.url) {
          window.open(link, '_blank');
        } else {
          window.open(link);
        }
      },
    });

    if (!WorkspaceUserRights.isNotConnected()) {
      //-- All files
      if (this.state.element.detached) {
        this.common_menu.push({
          type: 'menu',
          text: Languages.t('scenes.apps.drive.move_text2', [], 'Déplacer'),
          submenu_replace: true,
          submenu: [
            {
              type: 'react-element',
              reactElement: () => (
                <FilePicker
                  mode={'select_location'}
                  onChoose={res => this.moveTo(res)}
                  initialDirectory={{ id: '' }}
                />
              ),
            },
          ],
        });
      }

      if (!this.props.notInDrive && !this.state.element.detached) {
        if (this.common_menu.length > 0) {
          this.common_menu.push({ type: 'separator' });
        }

        if (!this.state.element.detached && this.state.element.parent_id) {
          this.common_menu = this.common_menu.concat([
            {
              type: 'menu',
              text: Languages.t('scenes.app.mainview.tabs.rename', [], 'Renommer'),
              submenu_replace: true,
              submenu: [
                {
                  type: 'title',
                  text: Languages.t('scenes.app.mainview.tabs.rename', [], 'Renommer'),
                },
                {
                  type: 'text',
                  text:
                    Languages.t('components.drive.elements.current_name', [], 'Nom actuel : ') +
                    this.state.element.name,
                },
                {
                  type: 'react-element',
                  reactElement: () => (
                    <div>
                      <div className="menu-buttons">
                        <Input
                          onEnter={() => {
                            this.rename();
                          }}
                          className="full_width bottom-margin"
                          onEchap={() => {
                            MenuManager.closeMenu();
                          }}
                          autoFocus
                          value={
                            this.state.new_name === undefined
                              ? this.state.element.is_directory
                                ? this.state.element.name
                                : this.state.element.name.replace(/\.[^.]*$/, '')
                              : this.state.new_name
                          }
                          onChange={evt => this.setState({ new_name: evt.target.value })}
                        />
                      </div>
                      <div className="menu-buttons">
                        <Button
                          disabled={(this.state.new_name || '').length <= 0}
                          type="button"
                          value={Languages.t(
                            'general.save',
                            [],
                            'Enregistrer',
                          )}
                          onClick={() => {
                            this.rename();
                          }}
                        />
                      </div>
                    </div>
                  ),
                },
              ],
            },
          ]);
        }

        if (!this.state.element.trash) {
          this.common_menu = this.common_menu.concat([
            {
              type: 'menu',
              text: Languages.t('scenes.apps.drive.right_preview.public', [], 'Accès public...'),
              submenu_replace: true,
              submenu: [
                {
                  type: 'title',
                  text: Languages.t(
                    'scenes.apps.drive.right_preview.public_link',
                    [],
                    "Lien d'accès public",
                  ),
                },
                {
                  type: 'react-element',
                  reactElement: () => (
                    <div>
                      {(this.state.element.acces_info || {}).token && (
                        <div>
                          <InputWithClipBoard
                            className={'bottom-margin full_width'}
                            value={
                              Globals.window.api_root_url +
                              '?view=drive_public_access&workspace_id=' +
                              this.state.element.workspace_id +
                              '&element_id=' +
                              this.state.element.id +
                              '&public_access_token=' +
                              (this.state.element.acces_info || {}).token
                            }
                            disabled={false}
                          />
                          <Button
                            className="danger"
                            onClick={() => {
                              AlertManager.confirm(() => {
                                DriveService.updateAccess(
                                  this.state.element,
                                  { public_access: false },
                                  this.props.driveCollectionKey || this.driveCollectionKey,
                                );
                              });
                            }}
                            value={Languages.t(
                              'components.drive.right_preview.suppress_link',
                              [],
                              'Supprimer le lien',
                            )}
                          />
                        </div>
                      )}
                      {!(this.state.element.acces_info || {}).token && (
                        <div>
                          <Button
                            onClick={() => {
                              DriveService.updateAccess(
                                this.state.element,
                                { public_access: true },
                                this.props.driveCollectionKey || this.driveCollectionKey,
                              );
                            }}
                            value={Languages.t(
                              'components.drive.right_preview.create_link',
                              [],
                              "Créer un lien d'accès",
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ),
                },
              ],
            },
          ]);

          if (!(this.state.element.application_id && this.state.element.is_directory)) {
            this.common_menu.push({
              type: 'menu',
              text: Languages.t('scenes.apps.drive.move_text', [], 'Déplacer'),
              submenu_replace: true,
              submenu: [
                {
                  type: 'react-element',
                  reactElement: () => (
                    <FilePicker
                      mode={'select_location'}
                      onChoose={res => this.moveTo(res)}
                      initialDirectory={{ id: this.state.element.parent_id }}
                    />
                  ),
                },
              ],
            });
          }

          if (WorkspaceUserRights.hasWorkspacePrivilege()) {
            if (this.state.element.application_id && this.state.element.is_directory) {
              this.common_menu.push({
                type: 'menu',
                text: Languages.t(
                  'components.drive.elements.configurate_mod',
                  [],
                  'Configurer le module...',
                ),
                onClick: () => {
                  var data = {
                    drive_element: this.state.element,
                  };
                  WorkspacesApps.notifyApp(
                    this.state.element.application_id,
                    'configuration',
                    'drive',
                    data,
                  );
                },
              });
            }
          }

          if (!this.state.element.is_directory && !this.state.element.url) {
            var versions_indicator = '';
            if ((this.state.element.versions || {}).length > 1) {
              versions_indicator = ' (' + (this.state.element.versions || {}).length + ')';
            }
            this.common_menu.push(
              {
                type: 'menu',
                text:
                  Languages.t(
                    'components.drive.elements.manage_version',
                    [],
                    'Gérer les versions',
                  ) +
                  versions_indicator +
                  '...',
                onClick: () => {
                  MediumPopupManager.open(<VersionDetails file={this.state.element} />, {
                    size: { width: 600 },
                  });
                },
              },
              {
                type: 'menu',
                text: Languages.t(
                  'scenes.apps.drive.navigators.navigator_labels.title',
                  [],
                  'Labels',
                ),
                submenu_replace: true,
                submenu: [
                  {
                    type: 'title',
                    text: Languages.t(
                      'scenes.apps.drive.navigators.navigator_labels.title',
                      [],
                      'Labels',
                    ),
                  },
                  {
                    type: 'react-element',
                    reactElement: level => (
                      <div>
                        <TagPicker
                          menu_level={level}
                          saveButton
                          canCreate={true}
                          value={this.state.element.tags || []}
                          onChange={values => {
                            this.state.element.tags = values;
                            MenuManager.closeMenu();
                            DriveService.save(
                              this.state.element,
                              this.props.driveCollectionKey || this.driveCollectionKey,
                            );
                          }}
                        />
                      </div>
                    ),
                  },
                ],
              },
            );
          }

          if (this.props.attachmentMenu) {
            this.common_menu.push(this.props.attachment_menu);
          }

          this.common_menu.push({ type: 'separator' });

          this.common_menu.push({
            type: 'menu',
            text: Languages.t(
              'scenes.apps.drive.right_preview.operations_delete',
              [],
              'Mettre à la corbeille',
            ),
            className: 'error',
            onClick: () => {
              DriveService.remove(
                [this.props.data],
                this.props.driveCollectionKey || this.driveCollectionKey,
              );
            },
          });
        } else {
          this.common_menu.push({
            type: 'menu',
            text: Languages.t(
              'scenes.apps.drive.right_preview.operations_restore',
              [],
              'Restaurer',
            ),
            onClick: () => {
              DriveService.restore(
                [this.props.data],
                this.props.driveCollectionKey || this.driveCollectionKey,
              );
            },
          });
          this.common_menu.push({
            type: 'menu',
            text: Languages.t(
              'scenes.apps.drive.remove_definitely_menu',
              [],
              'Supprimer définitivement',
            ),
            className: 'error',
            onClick: () => {
              AlertManager.confirm(() => {
                DriveService.removeDefinitively(
                  [this.props.data],
                  this.props.driveCollectionKey || this.driveCollectionKey,
                );
              });
            },
          });
        }
      }

      if (this.props.additionalMenu && this.props.additionalMenu.length > 0) {
        this.common_menu.push({ type: 'separator' });
        this.common_menu = this.common_menu.concat(this.props.additionalMenu);
      }
    }
  }
}
