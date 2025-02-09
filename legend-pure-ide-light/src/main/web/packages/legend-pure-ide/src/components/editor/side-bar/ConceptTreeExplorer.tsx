/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../stores/EditorStore';
import {
  FaChevronDown,
  FaChevronRight,
  FaCompress,
  FaCircleNotch,
} from 'react-icons/fa';
import type { ConceptTreeNode } from '../../../models/ConceptTree';
import {
  ElementConceptAttribute,
  PropertyConceptAttribute,
  ConceptType,
  getConceptIcon,
} from '../../../models/ConceptTree';
import { flowResult } from 'mobx';
import { FileCoordinate } from '../../../models/PureFile';
import { MdRefresh } from 'react-icons/md';
import { useApplicationStore } from '@finos/legend-application';
import type { TreeNodeContainerProps } from '@finos/legend-art';
import {
  BlankPanelContent,
  clsx,
  ContextMenu,
  PanelLoadingIndicator,
  TreeView,
} from '@finos/legend-art';
import { isNonNullable } from '@finos/legend-shared';
import { useDrag } from 'react-dnd';

const ConceptExplorerContextMenu = observer(
  (
    props: {
      node: ConceptTreeNode;
      viewConceptSource: (node: ConceptTreeNode) => void;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { node, viewConceptSource } = props;
    const nodeType = node.data.li_attr.pureType;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const rename = (): void =>
      applicationStore.notifyUnsupportedFeature('Rename');
    const renamePackage = (): void =>
      applicationStore.notifyUnsupportedFeature('Rename package');
    const renameProperty = (): void =>
      applicationStore.notifyUnsupportedFeature('Rename property');
    const runTests = (): Promise<void> =>
      flowResult(editorStore.executeTests(node.data.li_attr.pureId));
    const move = (): void =>
      applicationStore.notifyUnsupportedFeature('Move file');
    const viewSource = (): void => viewConceptSource(node);
    const serviceJSON = (): void => {
      window.open(
        `${editorStore.client.baseUrl}/execute?func=${node.data.li_attr.pureId}&mode=${editorStore.client.mode}`,
        '_blank',
      );
    };

    return (
      <div ref={ref} className="explorer__context-menu">
        {nodeType === ConceptType.PACKAGE && (
          <div className="explorer__context-menu__item" onClick={renamePackage}>
            Rename
          </div>
        )}
        {nodeType === ConceptType.PROPERTY && (
          <div
            className="explorer__context-menu__item"
            onClick={renameProperty}
          >
            Rename
          </div>
        )}
        {nodeType !== ConceptType.PACKAGE && nodeType !== ConceptType.PROPERTY && (
          <div className="explorer__context-menu__item" onClick={rename}>
            Rename
          </div>
        )}
        {nodeType === ConceptType.PACKAGE && (
          <div className="explorer__context-menu__item" onClick={runTests}>
            Run tests
          </div>
        )}
        {nodeType !== ConceptType.PACKAGE && nodeType !== ConceptType.PROPERTY && (
          <div className="explorer__context-menu__item" onClick={move}>
            Move
          </div>
        )}
        {nodeType === ConceptType.FUNCTION && (
          <div className="explorer__context-menu__item" onClick={serviceJSON}>
            Service (JSON)
          </div>
        )}
        {nodeType !== ConceptType.PACKAGE && (
          <div className="explorer__context-menu__item" onClick={viewSource}>
            View Source
          </div>
        )}
      </div>
    );
  },
  { forwardRef: true },
);

export enum CONCEPT_TREE_DND_TYPE {
  UNSUPPORTED = 'UNSUPPORTED',
  CLASS = 'CLASS',
}

const ConceptTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ConceptTreeNode,
    {
      onNodeOpen: (node: ConceptTreeNode) => void;
      onNodeExpand: (node: ConceptTreeNode) => void;
      onNodeCompress: (node: ConceptTreeNode) => void;
      viewConceptSource: (node: ConceptTreeNode) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
    useState(false);
  const { onNodeOpen, onNodeExpand, onNodeCompress, viewConceptSource } =
    innerProps;
  const isExpandable = [
    ConceptType.PACKAGE,
    ConceptType.CLASS,
    ConceptType.ASSOCIATION,
  ].includes(node.data.li_attr.pureType as ConceptType);
  const selectNode: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onNodeSelect?.(node);
  };
  const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
  const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
  const toggleExpansion = (): void => {
    if (node.isLoading) {
      return;
    }
    if (node.isOpen) {
      onNodeCompress(node);
    } else {
      onNodeExpand(node);
    }
  };
  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = () => {
    if (node.isLoading) {
      return;
    }
    if (isExpandable) {
      toggleExpansion();
    } else {
      onNodeOpen(node);
    }
  };
  const [, dragRef] = useDrag(
    () => ({
      type:
        node.data.li_attr.pureType === 'Class'
          ? CONCEPT_TREE_DND_TYPE.CLASS
          : CONCEPT_TREE_DND_TYPE.UNSUPPORTED,
      item: node.data,
    }),
    [node],
  );

  return (
    <ContextMenu
      content={
        <ConceptExplorerContextMenu
          node={node}
          viewConceptSource={viewConceptSource}
        />
      }
      menuProps={{ elevation: 7 }}
      onOpen={onContextMenuOpen}
      onClose={onContextMenuClose}
    >
      <div
        className={clsx(
          'tree-view__node__container explorer__package-tree__node__container',
          {
            'explorer__package-tree__node__container--selected-from-context-menu':
              !node.isSelected && isSelectedFromContextMenu,
          },
          {
            'explorer__package-tree__node__container--selected':
              node.isSelected,
          },
        )}
        onClick={selectNode}
        ref={dragRef}
        onDoubleClick={onDoubleClick}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon explorer__package-tree__node__icon">
          {node.isLoading && (
            <div className="explorer__package-tree__node__icon__expand explorer__package-tree__node__icon__expand--is-loading">
              <FaCircleNotch />
            </div>
          )}
          {!node.isLoading && (
            <div
              className="explorer__package-tree__node__icon__expand"
              onClick={toggleExpansion}
            >
              {!isExpandable ? (
                <div />
              ) : node.isOpen ? (
                <FaChevronDown />
              ) : (
                <FaChevronRight />
              )}
            </div>
          )}
          <div className="explorer__package-tree__node__icon__type">
            {getConceptIcon(node.data.li_attr.pureType)}
          </div>
        </div>
        <button
          className="tree-view__node__label explorer__package-tree__node__label"
          tabIndex={-1}
          dangerouslySetInnerHTML={{ __html: node.label }}
        />
      </div>
    </ContextMenu>
  );
};

const FileExplorerTree = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const treeState = editorStore.conceptTreeState;
  const treeData = editorStore.conceptTreeState.getTreeData();
  const onNodeSelect = (node: ConceptTreeNode): void =>
    treeState.setSelectedNode(node);
  const onNodeOpen = (node: ConceptTreeNode): Promise<void> =>
    flowResult(treeState.openNode(node)).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  const onNodeExpand = (node: ConceptTreeNode): Promise<void> =>
    flowResult(treeState.expandNode(node)).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  const onNodeCompress = (node: ConceptTreeNode): void => {
    node.isOpen = false;
    treeState.refreshTree();
  };
  const getChildNodes = (node: ConceptTreeNode): ConceptTreeNode[] => {
    if (node.isLoading || !node.childrenIds) {
      return [];
    }
    return node.childrenIds
      .map((childId) => treeData.nodes.get(childId))
      .filter(isNonNullable);
  };
  const deselectTreeNode = (): void => treeState.setSelectedNode(undefined);
  const viewConceptSource = (node: ConceptTreeNode): void => {
    const nodeAttribute = node.data.li_attr;
    if (
      nodeAttribute instanceof ElementConceptAttribute ||
      nodeAttribute instanceof PropertyConceptAttribute
    ) {
      editorStore.directoryTreeState.revealPath(
        nodeAttribute.file,
        true,
        new FileCoordinate(
          nodeAttribute.file,
          Number.parseInt(nodeAttribute.line, 10),
          Number.parseInt(nodeAttribute.column, 10),
        ),
      );
    }
  };

  return (
    <ContextMenu
      className="explorer__content"
      disabled={true}
      menuProps={{ elevation: 7 }}
    >
      <div className="explorer__content__inner" onClick={deselectTreeNode}>
        <TreeView
          components={{
            TreeNodeContainer: ConceptTreeNodeContainer,
          }}
          treeData={treeData}
          onNodeSelect={onNodeSelect}
          getChildNodes={getChildNodes}
          innerProps={{
            onNodeOpen,
            onNodeExpand,
            onNodeCompress,
            viewConceptSource,
          }}
        />
      </div>
    </ContextMenu>
  );
});

export const ConceptTreeExplorer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const treeState = editorStore.conceptTreeState;
  const refreshTree = (): Promise<void> =>
    flowResult(treeState.refreshTreeData()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  const collapseTree = (): void => {
    const treeData = treeState.getTreeData();
    treeData.nodes.forEach((node) => {
      node.isOpen = false;
    });
    treeState.setSelectedNode(undefined);
    treeState.refreshTree();
  };

  return (
    <div className="panel explorer">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            CONCEPTS
          </div>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <div className="panel explorer">
          <div className="panel__header explorer__header">
            <div className="panel__header__title" />
            <div className="panel__header__actions">
              <button
                className="panel__header__action explorer__btn__refresh"
                onClick={refreshTree}
                title="Refresh Tree"
              >
                <MdRefresh />
              </button>
              <button
                className="panel__header__action"
                onClick={collapseTree}
                title="Collapse All"
              >
                <FaCompress />
              </button>
            </div>
          </div>
          <div className="panel__content explorer__content__container">
            <PanelLoadingIndicator
              isLoading={treeState.loadInitialDataState.isInProgress}
            />
            {treeState.loadInitialDataState.hasSucceeded && (
              <FileExplorerTree />
            )}
            {!treeState.loadInitialDataState.hasSucceeded &&
              treeState.statusText && (
                <div className="explorer__content__container__message">
                  {treeState.statusText}
                </div>
              )}
            {treeState.loadInitialDataState.hasFailed && (
              <BlankPanelContent>
                Failed to build concept tree
              </BlankPanelContent>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
