import React, { KeyboardEvent } from "react";
import { Editor, EditorState, Modifier, CompositeDecorator, RichUtils, DraftEditorCommand, DraftHandleValue, DraftDecorator, KeyBindingUtil } from "draft-js";
import { toString } from "./EditorDataParser";
import useMentions, { MentionSuggestionType } from "./components/mentions/index";
import useEmojis, { EmojiSuggestionType } from "./components/emoji";
import useChannel, { ChannelSuggestionType } from "./components/channel";
import useCommand, { CommandSuggestionType } from "./components/commands";
import { SuggestionList } from "./components/suggestion/SuggestionList";
import EmojiSuggestion from "./components/emoji/EmojiSuggestion";
import MentionSuggestion from "./components/mentions/MentionSuggestion";
import ChannelSuggestion from "./components/channel/ChannelSuggestion";
import "./Editor.scss";
import CommandSuggestion from "./components/commands/CommandSuggestion";
import { getCaretCoordinates, getInsertRange, getTrigger } from "./EditorUtils";

const { isSoftNewlineEvent } = KeyBindingUtil;

// inspired from https://codepen.io/ndne/pen/XEbMyP

export type EditorTextFormat = "raw" | "markdown";

type SyntheticKeyboardEvent = KeyboardEvent<{}> & {code: string};

type CaretCoordinates = {
  x: number;
  y: number;
};

type CurrentSuggestion<T> = {
  position: CaretCoordinates;
  searchText: string;
  items: Array<T>;
};

type EditorProps = {
  editorState: EditorState;
  onSubmit?: (content: string, editorState?: EditorState) => void;
  onChange?: (editorState: EditorState) => void;
  onTab?: () => void;
  clearOnSubmit: boolean;
  outputFormat: EditorTextFormat;
  placeholder?: string;
};

export type EditorSuggestionPlugin<SuggestionType> = {
  resolver: (text: string, callback: (items: SuggestionType[]) => void) => void;
  decorator: DraftDecorator;
  trigger: string | RegExp;
  resourceType: string;
  getTextDisplay?: (item: SuggestionType) => string;
};

type EditorViewState = {
  activeSuggestion: CurrentSuggestion<MentionSuggestionType | EmojiSuggestionType | ChannelSuggestionType | CommandSuggestionType> | null;
  suggestionType: string;
  suggestionIndex: number;
};

export class EditorView extends React.Component<EditorProps, EditorViewState> {
  outputFormat: EditorTextFormat;
  editor!: Editor | null;
  emojis: EditorSuggestionPlugin<EmojiSuggestionType>;
  mentions: EditorSuggestionPlugin<MentionSuggestionType>;
  channels: EditorSuggestionPlugin<ChannelSuggestionType>;
  // TODO: apps/commands can be disabled cf InputAutoComplete -> props -> disableApps
  commands: EditorSuggestionPlugin<CommandSuggestionType>;

  constructor(props: EditorProps) {
    super(props);

    this.emojis = useEmojis();
    this.mentions = useMentions();
    this.channels = useChannel();
    this.commands = useCommand();
    this.outputFormat = this.props.outputFormat || "markdown";
    this.state = this.getInitialState();
  }

  private getInitialState(): EditorViewState {
    return {
      activeSuggestion: null,
      suggestionIndex: 0,
      suggestionType: "",
    }
  }

  private resetState(callback?: () => void | undefined): void {
    this.setState(this.getInitialState(), callback);
  }

  private resetStateAndFocus(): void {
    this.resetState(() => { (requestAnimationFrame(() => this.focus())) });
  }

  private isDisplayingSuggestions(): boolean {
    return !!(this.state.activeSuggestion?.items.length);
  }

  handleKeyCommand(command: DraftEditorCommand, editorState: EditorState): DraftHandleValue {
    const newState = RichUtils.handleKeyCommand(editorState, command);

    if (newState) {
      this.onChange(newState);
      return 'handled';
    }

    return 'not-handled';
  }

  handleReturn(e: SyntheticKeyboardEvent, editorState: EditorState): DraftHandleValue {
    if (this._handleReturnSoftNewline(e, editorState)) {
      return 'handled';
    }
    
    if (this.isDisplayingSuggestions()) {
      if (this.state.suggestionType === this.emojis.resourceType) {
        this.handleEmojiSuggestionSelected(this.state.activeSuggestion?.items[this.state.suggestionIndex] as EmojiSuggestionType);
        return 'handled';
      }
      
      if (this.state.suggestionType === this.mentions.resourceType) {
        this.handleMentionSuggestionSelected(this.state.activeSuggestion?.items[this.state.suggestionIndex] as MentionSuggestionType);
        return 'handled';
      }

      if (this.state.suggestionType === this.channels.resourceType) {
        this.handleChannelSuggestionSelected(this.state.activeSuggestion?.items[this.state.suggestionIndex] as ChannelSuggestionType);
        return 'handled';
      }

      return 'handled';
    }

    if (this.submit(editorState)) {
      return 'handled';
    }
    
    return 'handled';
  }
  
  submit(editorState: EditorState): boolean {
    this.props.onSubmit && this.props.onSubmit(toString(editorState, this.outputFormat));
    if (this.props.clearOnSubmit) {
      this.resetStateAndFocus();
    }

    return true;
  }

  /**
   * Handle shift + enter
   * 
   * @param e 
   * @param editorState 
   * @returns 
   */
  _handleReturnSoftNewline(e: SyntheticKeyboardEvent, editorState: EditorState): boolean {
    if (isSoftNewlineEvent(e)) {
      const selection = editorState.getSelection();

      if (selection.isCollapsed()) {
        this.onChange(RichUtils.insertSoftNewline(editorState));
      } else {
        let content = editorState.getCurrentContent();
        let newContent = Modifier.removeRange(content, selection, 'forward');
        let newSelection = newContent.getSelectionAfter();
        let block = newContent.getBlockForKey(newSelection.getStartKey());
        newContent = Modifier.insertText(
          newContent,
          newSelection,
          '\n',
          block.getInlineStyleAt(newSelection.getStartOffset()),
        );
        this.onChange(
          EditorState.push(editorState, newContent, 'insert-fragment')
        );
      }
      return true;
    }
    return false;
  }
  
  focus() {
    this.editor?.focus();
  }
  
  onChange(editorState: EditorState) {
    this.updateSuggestionsState();
    this.props.onChange && this.props.onChange(editorState);
  }
  
  updateSuggestionsState(): void {
    const trigger = getTrigger(this.mentions.trigger);

    if (!trigger) {
      // TODO: Put this at the end of the whole function?
      this.resetState();
    } else {
      this.mentions.resolver(trigger.text, (items) => {
        const activeSuggestion = {
          position: getCaretCoordinates(),
          searchText: trigger.text,
          items,
        };
        this.setState({
          activeSuggestion,
          suggestionType: this.mentions.resourceType,
          suggestionIndex: 0,
        });
      });
      return;
    }
    
    const triggerEmoji = getTrigger(this.emojis.trigger);
    if (!triggerEmoji) {
      this.resetState();
    } else {
      this.emojis.resolver(triggerEmoji.text, (items) => {
        const activeSuggestion = {
          position: getCaretCoordinates(),
          searchText: triggerEmoji.text,
          items,
        };
        this.setState({
          activeSuggestion,
          suggestionType: this.emojis.resourceType,
          suggestionIndex: 0,
        });
      });
      return;
    }

    const triggerChannel = getTrigger(this.channels.trigger);
    if (!triggerChannel) {
      this.resetState();
    } else {
      this.channels.resolver(triggerChannel.text, (items) => {
        const activeSuggestion = {
          position: getCaretCoordinates(),
          searchText: triggerChannel.text,
          items,
        };
        this.setState({
          activeSuggestion,
          suggestionType: this.channels.resourceType,
          suggestionIndex: 0,
        });
      });
      return;
    }
    
    const triggerCommand = getTrigger(this.commands.trigger);
    if (!triggerCommand) {
      this.resetState();
    } else {
      this.commands.resolver(triggerCommand.text, (items) => {
        const activeSuggestion = {
          position: getCaretCoordinates(),
          searchText: triggerCommand.text,
          items,
        };
        this.setState({
          activeSuggestion,
          suggestionType: this.commands.resourceType,
          suggestionIndex: 0,
        });
      });
      return;
    }
  }

  handleMentionSuggestionSelected(mention: MentionSuggestionType) {
    this.onChange(addMention(this.props.editorState, mention, "@"));
    this.resetStateAndFocus();
  }
  
  handleEmojiSuggestionSelected(emoji: EmojiSuggestionType) {
    this.onChange(addEmoji(this.props.editorState, emoji));
    this.resetStateAndFocus();
  }

  handleChannelSuggestionSelected(channel: ChannelSuggestionType) {
    this.onChange(addChannel(this.props.editorState, channel, "#"));
    this.resetStateAndFocus();
  }

  handleCommandSuggestionSelected(command: CommandSuggestionType) {
    this.onChange(addCommand(this.props.editorState, command, "/"));
    this.resetStateAndFocus();
  }
  
  insertEmoji(emoji: EmojiSuggestionType): void {
    this.onChange(insertEmoji(this.props.editorState, emoji));
    this.resetStateAndFocus();
  }

  onDownArrow(e: SyntheticKeyboardEvent): void {
    if (this.isDisplayingSuggestions()) {
      e.preventDefault();
      this.setState({ suggestionIndex: (this.state.suggestionIndex - 1) < 0 ? 0 : this.state.suggestionIndex - 1 })
    }
  }
  
  onUpArrow(e: SyntheticKeyboardEvent): void {
    if (this.isDisplayingSuggestions()) {
      e.preventDefault();
      const suggestionsLength = this.state.activeSuggestion?.items.length || 0;
      const suggestionIndex = this.state.suggestionIndex === suggestionsLength - 1 ? suggestionsLength - 1 : this.state.suggestionIndex + 1;
      this.setState({ suggestionIndex })
    }
  }

  onEscape(e: SyntheticKeyboardEvent): void {
    if (this.isDisplayingSuggestions()) {
      e.preventDefault();
      this.resetStateAndFocus();
    }
  }

  onTab(e: SyntheticKeyboardEvent): void {
    e.preventDefault();
    
    if (this.isDisplayingSuggestions()) {
      this.resetStateAndFocus();
    }

    this.props.onTab && this.props.onTab();
  }

  render() {
    return <div 
      className="editor" 
      onClick={ this.focus.bind(this) }>
      
      <Editor
        ref={ node => this.editor = node }
        editorState={ this.props.editorState } 
        onChange={this.onChange.bind(this)}
        handleKeyCommand={this.handleKeyCommand.bind(this)}
        handleReturn={this.handleReturn.bind(this)}
        onDownArrow={this.onDownArrow.bind(this)}
        onUpArrow={this.onUpArrow.bind(this)}
        onEscape={this.onEscape.bind(this)}
        onTab={this.onTab.bind(this)}
        placeholder={this.props.placeholder || ""}
        />
        
        {(
          this.isDisplayingSuggestions() &&  
            <div style={{ position: "relative", top: "-40px" }} className="suggestions">
              {(
                this.state.activeSuggestion?.items.length && this.state.suggestionType === this.mentions.resourceType &&
                <div className="mentions">
                  <SuggestionList<MentionSuggestionType>
                    list={this.state.activeSuggestion?.items as MentionSuggestionType[]}
                    position={"top"}
                    renderItem={(props: MentionSuggestionType) => (<MentionSuggestion {...props} />)}
                    onSelected={this.handleMentionSuggestionSelected.bind(this)}
                    selectedIndex={this.state.suggestionIndex}
                  />
                </div>
              )}

              {(
                this.state.activeSuggestion?.items.length && this.state.suggestionType === this.channels.resourceType &&
                <div className="channels">
                  <SuggestionList<ChannelSuggestionType>
                    list={this.state.activeSuggestion?.items as ChannelSuggestionType[]}
                    position={"top"}
                    renderItem={(props: ChannelSuggestionType) => (<ChannelSuggestion {...props} />)}
                    onSelected={this.handleChannelSuggestionSelected.bind(this)}
                    selectedIndex={this.state.suggestionIndex}
                  />
                </div>
              )}

              {(
                this.state.activeSuggestion?.items.length && this.state.suggestionType === this.commands.resourceType &&
                <div className="commands">
                  <SuggestionList<CommandSuggestionType>
                    list={this.state.activeSuggestion?.items as CommandSuggestionType[]}
                    position={"top"}
                    renderItem={(props: CommandSuggestionType) => (<CommandSuggestion {...props} />)}
                    onSelected={this.handleCommandSuggestionSelected.bind(this)}
                    selectedIndex={this.state.suggestionIndex}
                  />
                </div>
              )}

              {(
                this.state.activeSuggestion?.items.length && this.state.suggestionType === this.emojis.resourceType &&
                <div className="emojis">
                  <SuggestionList<EmojiSuggestionType>
                    list={this.state.activeSuggestion?.items as EmojiSuggestionType[]}
                    position={"top"}
                    renderItem={(props: EmojiSuggestionType) => (<EmojiSuggestion {...props} />)}
                    onSelected={this.handleEmojiSuggestionSelected.bind(this)}
                    selectedIndex={this.state.suggestionIndex}
                  />
                </div>
              )}
          </div>
        )}
    </div>
  }
}

const addMention = (editorState: EditorState, mention: MentionSuggestionType, prefix: string): EditorState => {
  const { start, end } = getInsertRange(editorState, prefix)
  const contentState = editorState.getCurrentContent()
  const currentSelection = editorState.getSelection()
  const selection = currentSelection.merge({
    anchorOffset: start,
    focusOffset: end,
  })
  
  // TODO: content can be anything so add the user id etc...
  const mentionEntity = contentState.createEntity('MENTION', 'IMMUTABLE', mention);
  const entityKey = mentionEntity.getLastCreatedEntityKey();

  // TODO: Can we avoid inserting the text and just relying on the decorator and Mention component?
  const newContentState = Modifier.replaceText(
    mentionEntity,
    selection,
    `${prefix}${mention.username}`,
    undefined,
    entityKey);

  const newEditorState = EditorState.push(
    // TODO: What is the difference with "insert-characters" which also works.
    editorState, newContentState, "insert-fragment"
  );

  return EditorState.forceSelection(
    newEditorState,
    newContentState.getSelectionAfter());

//  const newEditorState = EditorState.push(
//    editorState,
//    newContentState,
//    "insert-characters");
////    INSERT_ACTION_LABEL)
//  
//  return EditorState.forceSelection(
//    newEditorState,
//    newContentState.getSelectionAfter());
}

const addCommand = (editorState: EditorState, command: CommandSuggestionType, prefix: string): EditorState => {
  const { start, end } = getInsertRange(editorState, prefix)
  const contentState = editorState.getCurrentContent()
  const currentSelection = editorState.getSelection()
  const selection = currentSelection.merge({
    anchorOffset: start,
    focusOffset: end,
  })
  
  // TODO: content can be anything so add the user id etc...
  const entity = contentState.createEntity('COMMAND', 'IMMUTABLE', command);
  const entityKey = entity.getLastCreatedEntityKey();

  // TODO: Can we avoid inserting the text and just relying on the decorator and Mention component?
  const newContentState = Modifier.replaceText(
    entity,
    selection,
    command.command.split('[')[0].split('"')[0],
    undefined,
    entityKey);

  const newEditorState = EditorState.push(
    // TODO: What is the difference with "insert-characters" which also works.
    editorState, newContentState, "insert-fragment"
  );

  return EditorState.forceSelection(
    newEditorState,
    newContentState.getSelectionAfter());
}

const addChannel = (editorState: EditorState, channel: ChannelSuggestionType, prefix: string): EditorState => {
  const { start, end } = getInsertRange(editorState, prefix)
  const contentState = editorState.getCurrentContent()
  const currentSelection = editorState.getSelection()
  const selection = currentSelection.merge({
    anchorOffset: start,
    focusOffset: end,
  })
  
  const contentStateWithEntity = contentState.createEntity('CHANNEL', 'IMMUTABLE', channel);
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  const channelAsString = (channel.name || "").toLocaleLowerCase().replace(/[^a-z0-9_\-.\u00C0-\u017F]/g, '');

  // TODO: Can we avoid inserting the text and just relying on the decorator and Mention component?
  const newContentState = Modifier.replaceText(
    contentStateWithEntity,
    selection,
    `${prefix}${channelAsString}`,
    undefined,
    entityKey);

  const newEditorState = EditorState.push(
    // TODO: What is the difference with "insert-characters" which also works.
    editorState, newContentState, "insert-fragment"
  );

  return EditorState.forceSelection(
    newEditorState,
    newContentState.getSelectionAfter());

//  const newEditorState = EditorState.push(
//    editorState,
//    newContentState,
//    "insert-characters");
////    INSERT_ACTION_LABEL)
//  
//  return EditorState.forceSelection(
//    newEditorState,
//    newContentState.getSelectionAfter());
};

const addEmoji = (editorState: EditorState, emoji: EmojiSuggestionType): EditorState => {
  const { start, end } = getInsertRange(editorState, ":")
  const contentState = editorState.getCurrentContent()
  const currentSelection = editorState.getSelection()
  const selection = currentSelection.merge({
    anchorOffset: start,
    focusOffset: end,
  })
  
  const contentStateWithEntity = contentState.createEntity(
    'EMOJI', 'IMMUTABLE', emoji)
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  
  const newContentState = Modifier.replaceText(
    contentStateWithEntity,
    selection,
    emoji.native,
    undefined,
    entityKey)
  
  const newEditorState = EditorState.push(
    editorState,
    newContentState,
    "insert-characters");
  
  return EditorState.forceSelection(
    newEditorState,
    newContentState.getSelectionAfter());
}

/**
 * Temporary until we can merge with the one above
 * 
 * @param editorState
 * @param emoji 
 * @returns 
 */
const insertEmoji = (editorState: EditorState, emoji: EmojiSuggestionType): EditorState => {
  const contentState = editorState.getCurrentContent()
  const selection = editorState.getSelection()
  
  const entity = contentState.createEntity(
    'EMOJI', 'IMMUTABLE', emoji)
  const entityKey = entity.getLastCreatedEntityKey();
  
  const newContentState = Modifier.insertText(
    entity,
    selection,
    emoji.native,
    undefined,
    entityKey)
  
  const newEditorState = EditorState.push(
    editorState,
    newContentState,
    "insert-characters");
  
  return EditorState.forceSelection(
    newEditorState,
    newContentState.getSelectionAfter());
}