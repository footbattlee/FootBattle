import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    ref?: React.Ref<T>;
  }
}
