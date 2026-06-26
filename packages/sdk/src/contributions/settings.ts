import type { Disposable } from "../core/disposable";

export type SettingType = "boolean" | "string" | "number" | "enum" | "object";

export interface SettingSchemaEntry {
  type: SettingType;
  default?: unknown;
  description?: string;
  enum?: readonly unknown[];
}

export type SettingsSchema = Record<string, SettingSchemaEntry>;

export interface SettingsRegistry {
  defineSchema(schema: SettingsSchema): void;
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  onChange(key: string, handler: (value: unknown) => void): Disposable;
}
