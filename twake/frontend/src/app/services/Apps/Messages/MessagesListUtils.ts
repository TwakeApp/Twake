import { MessagesListServerUtils, Message } from './MessagesListServerUtils';
import Observable from 'services/observable';
import Collections from 'services/Collections/Collections';

class MessagesListUtilsManager {
  services: { [key: string]: MessagesListUtils } = {};
  constructor() {}
  get(collectionKey: string, serverService: MessagesListServerUtils) {
    if (this.services[collectionKey]) {
      return this.services[collectionKey];
    }
    this.services[collectionKey] = new MessagesListUtils(serverService);
    return this.services[collectionKey];
  }
}

export default new MessagesListUtilsManager();

/*
  This class will manage react virtualized and scroll cases
*/
export class MessagesListUtils extends Observable {
  //Internal variables
  scrollerNode: any;
  messagesContainerNode: any;
  messagesContainerNodeResizeObserver: any;
  ignoreNextScroll: number = 0;
  serverService: MessagesListServerUtils;
  lockedScrollTimeout: any;
  initDate: number = 0;
  visiblesMessages: { [key: string]: boolean } = {};
  registeredRender: any[] = [];

  //State
  highlighted: string = '';
  fixBottom: boolean = true;
  loadMoreLocked: boolean = false;
  currentScrollTop: number = 0;
  currentScrollHeight: number = 0;
  messagesContainerNodeScrollTop: number = 0;
  currentWitnessNode: any = 0;
  currentWitnessNodeScrollTop: number = 0;
  currentWitnessNodeClientTop: number = 0;
  messagesPositions: { [key: string]: { node: any; message: Message } } = {};
  getVisibleMessagesLastPosition: number = 0;

  constructor(serverService: MessagesListServerUtils) {
    super();

    this.setScroller = this.setScroller.bind(this);
    this.onContentChange = this.onContentChange.bind(this);
    this.setMessagesContainer = this.setMessagesContainer.bind(this);
    this.unsetScroller = this.unsetScroller.bind(this);
    this.unsetMessagesContainer = this.unsetMessagesContainer.bind(this);
    this.onScroll = this.onScroll.bind(this);

    this.serverService = serverService;

    //@ts-ignore
    this.messagesContainerNodeResizeObserver = new window.ResizeObserver(this.onContentChange);

    //@ts-ignore
    window.MessagesListUtils = this;
  }

  /* Getter / Setter for dom nodes */

  setScroller(node: any) {
    if (!node) {
      return;
    }
    this.unsetScroller();
    if (!this.scrollerNode) {
      node.addEventListener('scroll', this.onScroll);
    }
    this.scrollerNode = node;
    this.messagesContainerNodeResizeObserver.observe(node);
  }

  setMessagesContainer(node: any) {
    if (!node) {
      return;
    }
    this.unsetMessagesContainer();
    this.messagesContainerNode = node;
    this.messagesContainerNodeResizeObserver.observe(node);
  }

  setMessageNode(message: Message, node: any) {
    this.messagesPositions[message.front_id || 'undefined'] = {
      message: message,
      node: node,
    };
  }

  unsetScroller() {
    if (this.lockedScrollTimeout) clearTimeout(this.lockedScrollTimeout);
    if (this.scrollerNode) {
      this.scrollerNode.removeEventListener('scroll', this.onScroll);
    }
    this.scrollerNode = null;
  }

  unsetMessagesContainer() {
    if (this.messagesContainerNodeResizeObserver && this.messagesContainerNode) {
      this.messagesContainerNodeResizeObserver.unobserve(this.messagesContainerNode);
    }
  }

  /* END Getter / Setter for dom nodes */

  //Generate fake messages if needed
  getLoadingMessages(
    messagesListServerUtils: MessagesListServerUtils,
    position: 'top' | 'bottom',
  ): any[] {
    const fakes: { fake: boolean }[] = Array.apply(null, Array(1)).map(i => {
      return {
        fake: true,
      };
    });
    let fakeTop = fakes;
    let fakeBottom = fakes;

    if (messagesListServerUtils.hasFirstMessage()) {
      fakeTop = [];
    }
    if (messagesListServerUtils.hasLastMessage()) {
      fakeBottom = [];
    }
    if (position === 'top') {
      return fakeTop;
    } else {
      return fakeBottom;
    }
  }

  //Called by frontend on each rerender to update scroll
  updateScroll() {
    if (!this.messagesContainerNode || !this.scrollerNode) {
      return;
    }
    if (this.fixBottom) {
      this.scrollTo(this.scrollerNode.scrollHeight - this.scrollerNode.clientHeight, true);
    }
  }

  setWitnessMessage(node: any) {
    this.currentWitnessNode = node;
    this.currentWitnessNodeScrollTop = this.currentWitnessNode?.offsetTop || 0;
  }

  // Update visible / invisible message and set the 'witness message' (message that's should not move)
  getVisibleMessages(setWitness: boolean = false) {
    this.getVisibleMessagesLastPosition = this.currentScrollTop;
    let closestToCenter = 10000;
    let bestCenterNode: any;

    const upLimit = this.currentScrollTop;
    const bottomLimit = this.currentScrollTop + this.scrollerNode.clientHeight;
    let center = (upLimit + bottomLimit) / 2;
    if (this.fixBottom) {
      center = bottomLimit;
    }
    if (this.highlighted) {
      const scrollTop = this.getMessageScrollTop({ id: this.highlighted });
      if (scrollTop !== null) {
        center = scrollTop;
      }
    }

    Object.values(this.messagesPositions).forEach(nodeMessage => {
      if (nodeMessage.node) {
        const offsetTop =
          nodeMessage.node?.getDomElement()?.offsetTop + this.messagesContainerNodeScrollTop;
        const offsetBottom = offsetTop + nodeMessage.node?.getDomElement()?.clientHeight;

        if (setWitness) {
          const distanceFromCenter = Math.abs((offsetTop + offsetBottom) / 2 - center);
          if (distanceFromCenter < closestToCenter) {
            closestToCenter = distanceFromCenter;
            bestCenterNode = nodeMessage.node.getDomElement();
          }
        }

        if (
          offsetBottom > upLimit - this.scrollerNode.clientHeight / 2 &&
          offsetTop < bottomLimit + this.scrollerNode.clientHeight / 2
        ) {
          this.registerDelayedRender(nodeMessage.node);
        } else {
          if (nodeMessage.message.id === this.highlighted) {
            this.removeHighlightMessage();
          }
          nodeMessage.node.stopRenderContent();
          //Do nothing
        }
      }
    });

    if (this.highlighted) {
      const message = Collections.get('messages').find(this.highlighted);
      bestCenterNode = this.messagesPositions[message?.id]?.node?.getDomElement() || bestCenterNode;
    }
    if (bestCenterNode) this.setWitnessMessage(bestCenterNode);
  }

  registerDelayedRender(messageNode: any) {
    this.registeredRender.push(messageNode);
  }

  triggerDelayedRender() {
    this.registeredRender.forEach((node: any) => {
      node.startRenderContent();
    });
    this.registeredRender = [];
  }

  //Search for a message and scroll to it
  scrollToMessage(message: Message): boolean {
    return Object.values(this.messagesPositions).some(nodeMessage => {
      if (
        nodeMessage.message?.id === message.id ||
        nodeMessage.message?.front_id === message.front_id
      ) {
        this.fixBottom = false;
        const offsetTop =
          nodeMessage.node?.getDomElement()?.offsetTop + this.messagesContainerNodeScrollTop;
        this.scrollTo(offsetTop - 64, true);
        this.highlightMessage(message.id || '');
        return true;
      }
    });
  }

  highlightMessage(mid: string) {
    this.highlighted = mid;
    this.serverService.notify();
  }

  removeHighlightMessage() {
    this.highlighted = '';
    this.serverService.notify();
  }

  //Search for a message and scroll to it
  getMessageScrollTop(message: Message): number | null {
    let offsetTop = null;
    Object.values(this.messagesPositions).some(nodeMessage => {
      if (
        nodeMessage.message?.id === message.id ||
        nodeMessage.message?.front_id === message.front_id
      ) {
        offsetTop =
          nodeMessage.node?.getDomElement()?.offsetTop + this.messagesContainerNodeScrollTop;
        return true;
      }
    });
    return offsetTop;
  }

  scrollTo(position: number | true, changeWitness: boolean = false) {
    if (!this.scrollerNode) {
      return;
    }
    if (position === true) {
      position = this.scrollerNode.scrollHeight - this.scrollerNode.clientHeight;
    }
    if (this.scrollerNode) {
      this.ignoreNextScroll++;
      const smallJump = position - this.scrollerNode.scrollTop;
      if (
        this.fixBottom &&
        smallJump > 0 &&
        smallJump < 200 &&
        this.initDate > 0 &&
        new Date().getTime() - this.initDate > 2000
      ) {
        this.scrollerNode.scroll({
          top: position,
          //behavior: 'smooth', still need to did around this one
        });
      } else {
        this.scrollerNode.scrollTop = position;
      }
      this.onScroll();
      this.getVisibleMessages(changeWitness);
      this.triggerDelayedRender();
    }
  }

  onContentChange() {
    this.ignoreNextScroll++; //Additional ignore for better results
    if (!this.scrollerNode || !this.messagesContainerNode) {
      return;
    }
    //In case top fake messages disapear

    if (this.initDate === 0) {
      this.initDate = new Date().getTime();
    }

    //Force witness node to keep at the same position
    this.scrollTo(
      (this.currentWitnessNode?.offsetTop || 0) +
        this.messagesContainerNode?.offsetTop -
        this.currentWitnessNodeClientTop,
    );

    const newClientTop =
      (this.currentWitnessNode?.offsetTop || 0) +
      this.messagesContainerNode?.offsetTop -
      this.scrollerNode.scrollTop;

    if (newClientTop != this.currentWitnessNodeClientTop) {
      this.scrollTo(
        this.scrollerNode.scrollTop + (newClientTop - this.currentWitnessNodeClientTop),
      );
    }

    //Get current status to detect changes on new messages are added to the list
    this.messagesContainerNodeScrollTop = this.messagesContainerNode?.offsetTop || 0;
    this.currentScrollHeight = this.messagesContainerNode.scrollHeight;
    this.currentScrollTop = this.scrollerNode.scrollTop;

    this.updateScroll();

    this.unlockScroll();

    this.getVisibleMessages();

    window.requestAnimationFrame(() => this.triggerDelayedRender());
  }

  lockScroll() {
    if (!this.scrollerNode) {
      return;
    }

    this.scrollerNode.style.pointerEvents = 'none';
    this.scrollerNode.style.overflow = 'hidden';
    this.loadMoreLocked = true;
    if (this.lockedScrollTimeout) {
      clearTimeout(this.lockedScrollTimeout);
    }
    this.lockedScrollTimeout = setTimeout(() => {
      this.unlockScroll();
    }, 3000);
  }

  unlockScroll() {
    if (!this.scrollerNode) {
      return;
    }

    this.scrollerNode.style.pointerEvents = 'all';
    this.scrollerNode.style.overflow = 'auto';
    this.loadMoreLocked = false;
  }

  async onScroll(evt?: any) {
    if (this.loadMoreLocked && evt) {
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    evt = {
      clientHeight: this.scrollerNode.clientHeight,
      scrollHeight: this.scrollerNode.scrollHeight,
      scrollTop: this.scrollerNode.scrollTop,
    };

    if (Math.abs(this.getVisibleMessagesLastPosition - this.currentScrollTop) > 200) {
      this.getVisibleMessages(this.ignoreNextScroll <= 0);
      this.triggerDelayedRender();
    }

    const goingUp = this.currentScrollTop - this.scrollerNode.scrollTop > 0;

    //Get current status to detect changes on new messages are added to the list
    this.currentScrollHeight = this.messagesContainerNode.scrollHeight;
    this.currentScrollTop = this.scrollerNode.scrollTop;

    this.currentWitnessNodeClientTop =
      (this.currentWitnessNode?.offsetTop || 0) +
      this.messagesContainerNode?.offsetTop -
      this.scrollerNode.scrollTop;

    //After this point, we only want to act if this is user scroll (and not ourselve scrolling)
    if (this.ignoreNextScroll > 0) {
      this.ignoreNextScroll--;

      if (
        evt.clientHeight + evt.scrollTop >= evt.scrollHeight &&
        this.serverService.hasLastMessage()
      ) {
        if (!this.fixBottom) {
          this.fixBottom = true;
          this.notify();
        }
      }

      return;
    }

    if (!this.loadMoreLocked) {
      const topFakeHeight = this.messagesContainerNode.childNodes[0].clientHeight || 0;
      const bottomFakeHeight =
        this.messagesContainerNode.childNodes[this.messagesContainerNode.childNodes.length - 1]
          .clientHeight || 0;
      if (evt.scrollTop <= this.scrollerNode.clientHeight && goingUp) {
        const didRequest = await this.serverService.loadMore();
        if (didRequest) console.log('load more up');
        if (didRequest) this.lockScroll();
      }
      if (
        evt.scrollHeight - (evt.scrollTop + evt.clientHeight) <= this.scrollerNode.clientHeight &&
        !goingUp
      ) {
        const didRequest = await this.serverService.loadMore(false);
        if (didRequest) console.log('load more down');
        if (didRequest) this.lockScroll();
      }
    }

    if (
      evt.clientHeight + evt.scrollTop >= evt.scrollHeight &&
      this.serverService.hasLastMessage()
    ) {
      if (!this.fixBottom) {
        this.fixBottom = true;
        this.notify();
      }
      this.removeHighlightMessage();
      this.updateScroll();
    } else {
      if (this.fixBottom) {
        this.fixBottom = false;
        this.notify();
      }
    }
  }
}
