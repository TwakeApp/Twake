import React, { Component } from 'react';
import Languages from 'services/languages/languages.js';
import Collections from 'services/Collections/Collections.js';
import MenusManager from 'services/Menus/MenusManager.js';
import Workspaces from 'services/workspaces/workspaces.js';
import AlertManager from 'services/AlertManager/AlertManager.js';
import Button from 'components/Buttons/Button.js';
import ReminderSelector from 'components/ReminderSelector/ReminderSelector.js';
import UserListManager from 'components/UserListManager/UserListManager.js';
import Menu from 'components/Menus/Menu.js';
import InputIcon from 'components/Inputs/InputIcon.js';
import Input from 'components/Inputs/Input.js';
import DateSelectorInput from 'components/Calendar/DatePicker.js';
import TimeSelector from 'components/Calendar/TimeSelector.js';
import Icon from 'components/Icon/Icon.js';
import Checkbox from 'components/Inputs/Checkbox.js';
import MediumPopupManager from 'services/mediumPopupManager/mediumPopupManager.js';
import Checklist from './Parts/Checklist.js';
import TagPicker from 'components/TagPicker/TagPicker.js';
import InputWithColor from 'components/Inputs/InputWithColor.js';
import TasksService from 'services/Apps/Tasks/Tasks.js';
import { ObjectModal, ObjectModalSectionTitle } from 'components/ObjectModal/ObjectModal.js';
import PseudoMarkdownCompiler from 'services/Twacode/pseudoMarkdownCompiler.js';
import AttachmentPicker from 'components/AttachmentPicker/AttachmentPicker.js';

import './Modal.scss';

export default class TaskEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      i18n: Languages,
    };
    Languages.addListener(this);
    Collections.get('tasks').addListener(this);
    //    Collections.get("tasks").listenOnly(this, [props.task.front_id]);
  }
  componentWillMount() {
    TasksService.preview = null;
  }
  componentWillUnmount() {
    Languages.removeListener(this);
    Collections.get('tasks').removeListener(this);
  }
  remove() {
    TasksService.remove(this.props.task, this.props.collectionKey);
  }
  archive() {
    TasksService.archive(this.props.task, this.props.collectionKey);
  }
  unarchive() {
    TasksService.unarchive(this.props.task, this.props.collectionKey);
  }
  change(key, value, notify) {
    console.log('change ' + key, value);
    this.props.task[key] = value;
    Collections.get('tasks').notify();
  }
  render() {
    var task = this.props.task;
    task.description = task.description || '';
    var description = task.description;

    if ((description || {}).original_str === '') {
      description = '';
    } else if (typeof description == 'object') {
      description = PseudoMarkdownCompiler.compileToText(description);
    }

    return (
      <ObjectModal
        className="taskModal task_details"
        onClose={() => MediumPopupManager.closeAll()}
        footer={
          <div>
            <Button
              className="small danger right-margin"
              style={{ width: 'auto' }}
              onClick={() => {
                this.remove();
              }}
            >
              {Languages.t('general.remove', [], 'Supprimer')}
            </Button>

            <Button
              className="small primary"
              style={{ width: 'auto', float: 'right' }}
              onClick={() => {
                if (typeof task.description == 'string') {
                  task.description = task.description || '';
                  var value = PseudoMarkdownCompiler.transformChannelsUsers(task.description);
                  task.description = PseudoMarkdownCompiler.compileToJSON(value);
                }
                Collections.get('tasks').save(task, this.props.collectionKey);
                Collections.get('tasks').updateObject(task, task.front_id);
                MediumPopupManager.closeAll();
              }}
            >
              {Languages.t('general.save', [], 'Enregistrer')}
            </Button>
          </div>
        }
      >
        <ObjectModalSectionTitle name="Title" style={{ marginTop: 0 }} />
        <Input
          autoFocus
          value={task.title || ''}
          placeholder={Languages.t('scenes.apps.tasks.modals.task_title_placeholder', [], 'Titre')}
          onChange={evt => {
            this.change('title', evt.target.value);
          }}
          className="full_width"
          big
        />

        <div style={{ marginTop: 16 }}>
          <TagPicker
            canCreate={true}
            value={task.tags || []}
            onChange={values => {
              this.change('tags', values, true);
            }}
          />
        </div>

        <ObjectModalSectionTitle name="Description" icon="align-left" />
        <Input
          autoHeight
          medium
          value={description || ''}
          placeholder={Languages.t(
            'scenes.apps.tasks.modals.task_description_placeholder',
            [],
            'Description',
          )}
          onChange={evt => {
            this.change('description', evt.target.value);
          }}
          className="full_width"
        />

        <ObjectModalSectionTitle name="Sous-tâches" icon="check-square" />
        <Checklist
          value={task.checklist}
          onChange={val => {
            this.change('checklist', val);
          }}
        />

        <ObjectModalSectionTitle
          name={Languages.t('scenes.apps.tasks.modals.participants', [], 'Participants')}
          icon="users-alt"
        />
        <UserListManager
          showAddMe
          showAddAll
          canRemoveMyself
          noPlaceholder
          users={(task.participants || []).map(participant => {
            return { id: participant.user_id_or_mail };
          })}
          scope="workspace"
          onUpdate={ids_mails => {
            this.change(
              'participants',
              ids_mails.map(id => {
                return { user_id_or_mail: id };
              }),
            );
            Menu.closeAll();
          }}
        />

        <ObjectModalSectionTitle
          name={Languages.t('scenes.apps.tasks.modals.attachments', [], 'Pièces jointes')}
          icon="paperclip"
        />
        <AttachmentPicker
          attachments={task.attachments}
          onChange={attachments => this.change('attachments', attachments)}
        />

        <ObjectModalSectionTitle name={Languages.t('', [], 'Notifications')} icon="bell" />

        <Checkbox
          value={task.before > 0}
          onChange={v => {
            this.change('before', v ? new Date().setHours(10, 0, 0) / 1000 + 60 * 60 * 24 * 7 : 0);
          }}
          className="small"
          label="Use deadline"
        />
        <br />
        {!!task.before && task.before > 0 && (
          <div>
            <DateSelectorInput
              ts={task.before}
              onChange={value => this.change('before', value)}
              className="small bottom-margin right-margin"
            />
            <TimeSelector
              ts={task.before}
              onChange={value => this.change('before', value)}
              className="small bottom-margin"
            />
          </div>
        )}
        {!!task.before && task.before > 0 && (
          <ReminderSelector
            reminders={task.notifications || []}
            onChange={reminders => this.change('notifications', reminders)}
          />
        )}

        <br />
        <Checkbox
          value={task.start > 0}
          onChange={v => {
            this.change('start', v ? new Date().setHours(10, 0, 0) / 1000 + 60 * 60 * 24 : 0);
          }}
          className="small"
          label="Use start time"
        />
        <br />
        {!!task.start && task.start > 0 && (
          <div>
            <DateSelectorInput
              ts={task.start}
              onChange={value => this.change('start', value)}
              className="small bottom-margin right-margin"
            />
            <TimeSelector
              ts={task.start}
              onChange={value => this.change('start', value)}
              className="small bottom-margin"
            />
          </div>
        )}

        <br />
        <br />
      </ObjectModal>
    );
  }
}
