<?php

namespace WebsiteApi\WorkspacesBundle\Model;

/**
 * This is an interface for the service Workspaces
 */
interface WorkspacesInterface
{

	// @getPrivate return user private workspace (create workspace if not exist)
	public function getPrivate($currentUserId = null);

	// @create creates a new workspace in group
	public function create($name, $groupId = null, $userId = null);

	// @removeWorkspace removes a workspace from a group
	public function remove($groupId, $workspaceId, $currentUserId = null);

	// @changeData set workspace data
	public function changeData($workspaceId, $name, $thumbnailFile, $currentUserId = null);

	// @getApps get apps for workspace
	public function getApps($workspaceId, $currentUserId = null);

}