import * as React from "react";

// constate(useCounter, value => value.count)
//                      ^^^^^^^^^^^^^^^^^^^^
type Selector<Value> = (value: Value) => any;

// const [Provider, useCount, useIncrement] = constate(...)
//                  ^^^^^^^^^^^^^^^^^^^^^^
type SelectorHooks<Selectors> = {
  [K in keyof Selectors]: () => Selectors[K] extends (...args: any) => infer R
    ? R
    : never;
};

type Provider<Props, Value> = React.FC<Props> & {
  useProvider: (
    props?: Props
  ) => [(element: React.ReactNode) => React.ReactElement, Value];
  FromValue: React.FC<{ value: Value }>;
};

// const [Provider, useCounterContext] = constate(...)
// or               ^^^^^^^^^^^^^^^^^
// const [Provider, useCount, useIncrement] = constate(...)
//                  ^^^^^^^^^^^^^^^^^^^^^^
type Hooks<Value, Selectors extends Selector<Value>[]> =
  Selectors["length"] extends 0 ? [() => Value] : SelectorHooks<Selectors>;

// const [Provider, useContextValue] = constate(useValue)
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
type ConstateTuple<Props, Value, Selectors extends Selector<Value>[]> = [
  Provider<Props, Value>,
  ...Hooks<Value, Selectors>
];

const NO_PROVIDER = {};

function createUseContext(context: React.Context<any>): any {
  return () => {
    const value = React.useContext(context);
    if (process.env.NODE_ENV !== "production") {
      if (value === NO_PROVIDER) {
        console.warn("Component must be wrapped with Provider.");
      }
    }
    return value;
  };
}

export function constate<Props, Value, Selectors extends Selector<Value>[]>(
  useValue: (props: Props) => Value,
  ...selectors: Selectors
): ConstateTuple<Props, Value, Selectors> {
  const contexts = [] as React.Context<any>[];
  const hooks = [] as unknown as Hooks<Value, Selectors>;

  const createContext = (displayName: string) => {
    const context = React.createContext(NO_PROVIDER);
    if (process.env.NODE_ENV !== "production") {
      if (displayName) {
        context.displayName = displayName;
      }
    }
    contexts.push(context);
    hooks.push(createUseContext(context));
  };

  if (selectors.length) {
    selectors.forEach((selector) => createContext(selector.name));
  } else {
    createContext(useValue.name);
  }

  const ConstateProviderFromValue: React.FC<{ value: Value }> = ({
    value,
    children,
  }) => {
    let element = children as React.ReactElement;
    for (let i = 0; i < contexts.length; i += 1) {
      const context = contexts[i];
      const selector = selectors[i] || ((v) => v);
      element = (
        <context.Provider value={selector(value)}>{element}</context.Provider>
      );
    }
    return element;
  };

  const ConstateProvider: Provider<Props, Value> = ({ children, ...props }) => {
    return (
      <ConstateProviderFromValue value={useValue(props as Props)}>
        {children}
      </ConstateProviderFromValue>
    );
  };

  ConstateProvider.FromValue = ConstateProviderFromValue;

  ConstateProvider.useProvider = (props?: Props) => {
    const value = useValue(props!);

    const inject = (element: React.ReactNode) => {
      return (
        <ConstateProviderFromValue value={value}>
          {element}
        </ConstateProviderFromValue>
      );
    };

    return [inject, value];
  };

  if (process.env.NODE_ENV !== "production") {
    if (useValue.name) {
      ConstateProvider.displayName = "Constate";
      ConstateProviderFromValue.displayName = "ConstateFromValue";
    }
  }

  return [ConstateProvider, ...hooks];
}

export default constate;
