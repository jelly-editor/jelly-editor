import type { FileStatus, GitFile, GitStatus } from "@jelly/sdk";
import { create } from "zustand";

export type { FileStatus, GitFile, GitStatus };

interface GitState {
  branch: string;
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
  isRepo: boolean;
  /** current workspace root (mirrors files' workspace via events) */
  workspacePath: string | null;
  /** repo-relative path of the diff open in the editor — drives the row highlight */
  activeDiffPath: string | null;

  setStatus: (status: GitStatus) => void;
  clearStatus: () => void;
  setWorkspacePath: (path: string | null) => void;
  setActiveDiffPath: (path: string | null) => void;
}

export const useGitStore = create<GitState>((set) => ({
  branch: "",
  staged: [],
  modified: [],
  untracked: [],
  isRepo: false,
  workspacePath: null,
  activeDiffPath: null,

  setStatus: ({ branch, staged, modified, untracked, isRepo }) =>
    set({ branch, staged, modified, untracked, isRepo }),

  clearStatus: () =>
    set({ branch: "", staged: [], modified: [], untracked: [], isRepo: false }),

  setWorkspacePath: (workspacePath) => set({ workspacePath }),
  setActiveDiffPath: (activeDiffPath) => set({ activeDiffPath }),
}));
