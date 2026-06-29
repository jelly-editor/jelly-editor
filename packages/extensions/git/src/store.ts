import type { FileStatus, GitFile, GitStash, GitStatus } from "@jelly/sdk";
import { create } from "zustand";

export type { FileStatus, GitFile, GitStash, GitStatus };

interface GitState {
  branch: string;
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
  stashes: GitStash[];
  isRepo: boolean;
  workspacePath: string | null;
  activeDiffPath: string | null;

  setStatus: (status: GitStatus) => void;
  clearStatus: () => void;
  setStashes: (stashes: GitStash[]) => void;
  setWorkspacePath: (path: string | null) => void;
  setActiveDiffPath: (path: string | null) => void;
}

export const useGitStore = create<GitState>((set) => ({
  branch: "",
  staged: [],
  modified: [],
  untracked: [],
  stashes: [],
  isRepo: false,
  workspacePath: null,
  activeDiffPath: null,

  setStatus: ({ branch, staged, modified, untracked, isRepo }) =>
    set({ branch, staged, modified, untracked, isRepo }),

  clearStatus: () =>
    set({ branch: "", staged: [], modified: [], untracked: [], isRepo: false }),

  setStashes: (stashes) => set({ stashes }),
  setWorkspacePath: (workspacePath) => set({ workspacePath }),
  setActiveDiffPath: (activeDiffPath) => set({ activeDiffPath }),
}));
