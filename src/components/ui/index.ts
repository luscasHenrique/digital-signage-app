/* Liquid Glass UI — ponto único de importação
   import { Button, TextField, Sidebar } from "@/components/ui"; */

// Tema
export { ThemeProvider, useTheme } from "./Theme/ThemeProvider";
export { ThemeScript } from "./Theme/ThemeScript";
export { ThemeToggle } from "./Theme/ThemeToggle";
export type { ThemePreference, ResolvedTheme } from "./Theme/theme-store";

// Superfícies e feedback
export { Card } from "./Card/Card";
export { Alert } from "./Alert/Alert";
export { Avatar } from "./Avatar/Avatar";
export { Badge, formatCount } from "./Badge/Badge";
export { Spinner } from "./Spinner/Spinner";

// Ações
export { Button } from "./Button/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button/Button";
export { SegmentedControl } from "./SegmentedControl/SegmentedControl";
export { AlertButton } from "./AlertButton/AlertButton";
export type { AlertButtonProps } from "./AlertButton/AlertButton";
export type { SegmentedItem } from "./SegmentedControl/SegmentedControl";

// Inputs
export { Field } from "./Field/Field";
export { TextField } from "./TextField/TextField";
export type { TextFieldProps } from "./TextField/TextField";
export { Textarea } from "./Textarea/Textarea";
export { Select } from "./Select/Select";
export type { SelectOption, SelectProps } from "./Select/Select";
export { MultiSelect } from "./MultiSelect/MultiSelect";
export type { MultiSelectProps } from "./MultiSelect/MultiSelect";
export { Checkbox } from "./Checkbox/Checkbox";
export { RadioGroup, Radio } from "./Radio/Radio";
export { Switch } from "./Switch/Switch";
export { OTPInput } from "./OTPInput/OTPInput";

// Overlays
export { Tooltip } from "./Tooltip/Tooltip";
export { Popover } from "./Popover/Popover";

// Navegação
export { Sidebar } from "./Sidebar/Sidebar";
export type { SidebarItem, SidebarSection, SidebarUser, SidebarLinkProps } from "./Sidebar/Sidebar";
export { MobileMenu } from "./MobileMenu/MobileMenu";
export type { MobileMenuProps, MobileMenuTriggerProps } from "./MobileMenu/MobileMenu";
export { TabBar } from "./TabBar/TabBar";
export type { TabBarProps, TabBarItem, TabBarAction } from "./TabBar/TabBar";
export { NotificationBell, formatRelativeTime } from "./NotificationBell/NotificationBell";
export type { NotificationItem } from "./NotificationBell/NotificationBell";

// Autenticação
export { LoginForm } from "./Auth/LoginForm";
export type { LoginValues } from "./Auth/LoginForm";
export { SignUpForm } from "./Auth/SignUpForm";
export type { SignUpValues } from "./Auth/SignUpForm";
export { AuthCard, SocialButtons } from "./Auth/AuthCard";
export { PasswordStrengthMeter } from "./Auth/PasswordStrengthMeter";
export { useForm } from "./Auth/useForm";
export * as validators from "./Auth/validators";

// Overlays (v1.1)
export { Dialog } from "./Dialog/Dialog";
export type { DialogProps } from "./Dialog/Dialog";
export { ToastProvider, useToast } from "./Toast/Toast";
export type { ToastOptions, ToastTone, ToastPosition } from "./Toast/Toast";
export { DropdownMenu } from "./DropdownMenu/DropdownMenu";
export type { MenuEntry } from "./DropdownMenu/DropdownMenu";

// Navegação e dados (v1.1)
export { Tabs } from "./Tabs/Tabs";
export type { TabItem } from "./Tabs/Tabs";
export { Table } from "./Table/Table";
export type { TableColumn, SortState } from "./Table/Table";

// Inputs (v1.1)
export { Combobox } from "./Combobox/Combobox";
export type { ComboboxOption } from "./Combobox/Combobox";
export { Slider } from "./Slider/Slider";
export { DatePicker, defaultRangePresets } from "./DatePicker/DatePicker";
export type { DatePreset } from "./DatePicker/DatePicker";
export { Calendar } from "./DatePicker/Calendar";
export type { DateRange } from "./DatePicker/date-utils";

// v1.2
export { Accordion } from "./Accordion/Accordion";
export type { AccordionItem } from "./Accordion/Accordion";
export { Stepper, getStepStatus } from "./Stepper/Stepper";
export type { StepItem, StepStatus } from "./Stepper/Stepper";
export { Skeleton, SkeletonGroup } from "./Skeleton/Skeleton";
export { Breadcrumb } from "./Breadcrumb/Breadcrumb";
export type { BreadcrumbItem } from "./Breadcrumb/Breadcrumb";
export { FileUpload, formatBytes } from "./FileUpload/FileUpload";
export type { UploadFile, UploadHandler, UploadStatus } from "./FileUpload/FileUpload";

// v1.4
export { Loading, LoadingBar } from "./Loading/Loading";
export type { LoadingProps, LoadingBarProps, LoadingVariant, LoadingSize, LoadingTone } from "./Loading/Loading";
export { LoadingOverlay } from "./Loading/LoadingOverlay";
export type { LoadingOverlayProps } from "./Loading/LoadingOverlay";
