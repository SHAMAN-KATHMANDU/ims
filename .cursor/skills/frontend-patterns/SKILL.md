---
name: frontend-patterns
description: React/Next.js patterns including component composition, compound components, custom hooks, state management, performance optimization, form handling, and accessibility.
origin: ECC
---

# Frontend Patterns

Production-ready React and Next.js patterns for scalable, performant, accessible UIs.

## When to Activate

- Building new React components
- Designing component APIs
- Managing complex state
- Optimizing rendering performance
- Handling forms and validation
- Implementing data fetching
- Ensuring accessibility

## Component Composition

### Single Responsibility

```tsx
// ❌ BAD: Component doing too much
function UserDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then(setUser);
    fetch(`/api/users/${userId}/orders`)
      .then((r) => r.json())
      .then(setOrders);
    setLoading(false);
  }, [userId]);

  return (
    <div>{/* User profile, order list, stats, all in one component */}</div>
  );
}

// ✅ GOOD: Composed from focused components
function UserDashboard({ userId }: { userId: string }) {
  return (
    <DashboardLayout>
      <UserProfile userId={userId} />
      <OrderList userId={userId} />
      <UserStats userId={userId} />
    </DashboardLayout>
  );
}
```

### Compound Components

```tsx
// ✅ GOOD: Compound component pattern for flexible APIs
interface CardContextValue {
  variant: "default" | "elevated" | "outlined";
}

const CardContext = createContext<CardContextValue>({ variant: "default" });

function Card({ children, variant = "default" }: CardProps) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={cn("rounded-lg", variantStyles[variant])}>{children}</div>
    </CardContext.Provider>
  );
}

Card.Header = function CardHeader({ children }: { children: React.ReactNode }) {
  const { variant } = useContext(CardContext);
  return (
    <div className={cn("p-4 border-b", headerVariantStyles[variant])}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>;
};

Card.Footer = function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-t">{children}</div>;
};

// Usage
<Card variant="elevated">
  <Card.Header>Order #1234</Card.Header>
  <Card.Body>Order details...</Card.Body>
  <Card.Footer>
    <Button>View Details</Button>
  </Card.Footer>
</Card>;
```

## Custom Hooks

### Data Fetching Hook

```tsx
// ✅ GOOD: Encapsulate data fetching logic
function useUser(userId: string) {
  const [state, setState] = useState<{
    data: User | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const user = await userApi.getById(userId);
        if (!cancelled) setState({ data: user, loading: false, error: null });
      } catch (error) {
        if (!cancelled)
          setState({ data: null, loading: false, error: error as Error });
      }
    }

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}

// Or with React Query (recommended)
function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => userApi.getById(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Form Hook

```tsx
function useForm<T extends z.ZodSchema>(schema: T) {
  type FormData = z.infer<T>;
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );

  function validate(data: unknown): data is FormData {
    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormData;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  return { errors, validate };
}
```

### Debounce Hook

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage: search input
function SearchBar() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });
}
```

## State Management

### Local vs Global State

```tsx
// Local state: component-specific, doesn't need to be shared
const [isOpen, setIsOpen] = useState(false);
const [count, setCount] = useState(0);

// Server state: use React Query / SWR
const { data: users } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

// Global UI state: use Zustand or Context
const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  theme: "light",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));

// Form state: use React Hook Form
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Context for Dependency Injection

```tsx
// ✅ GOOD: Context for passing services/config, not frequently changing state
interface AuthContextValue {
  user: User | null;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: LoginDto) => {
    const user = await authApi.login(credentials);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

## Performance Optimization

### Memoization

```tsx
// ✅ GOOD: Memoize expensive computations
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
);

// ✅ GOOD: Stable callback references
const handleSubmit = useCallback(
  async (data: FormData) => {
    await createItem(data);
    onSuccess?.();
  },
  [createItem, onSuccess],
);

// ✅ GOOD: Prevent unnecessary re-renders
const MemoizedRow = memo(function Row({ item, onSelect }: RowProps) {
  return <tr onClick={() => onSelect(item.id)}>{/* ... */}</tr>;
});
```

### Code Splitting

```tsx
// ✅ GOOD: Lazy load heavy components
const DataTable = lazy(() => import("./DataTable"));
const ChartView = lazy(() => import("./ChartView"));

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DataTable data={data} />
    </Suspense>
  );
}

// ✅ GOOD: Next.js dynamic imports
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  loading: () => <Skeleton className="h-40" />,
  ssr: false, // Disable SSR for browser-only components
});
```

### Virtual Lists

```tsx
// ✅ GOOD: Virtualize long lists (react-virtual or @tanstack/virtual)
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          >
            <ItemRow item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Form Handling

### React Hook Form + Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "user"]),
});

type FormData = z.infer<typeof schema>;

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await userApi.create(data);
    reset();
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register("name")} aria-describedby="name-error" />
        {errors.name && (
          <p id="name-error" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register("email")}
          aria-describedby="email-error"
        />
        {errors.email && (
          <p id="email-error" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

## Accessibility (a11y)

```tsx
// ✅ GOOD: Semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

<main id="main-content">
  <h1>Dashboard</h1>
</main>

// ✅ GOOD: ARIA attributes
<button
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  Options
</button>

<div
  id="dropdown-menu"
  role="menu"
  aria-hidden={!isOpen}
>
  {/* menu items */}
</div>

// ✅ GOOD: Focus management for modals
function Modal({ isOpen, onClose, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">Modal Title</h2>
      {children}
      <button ref={closeButtonRef} onClick={onClose}>Close</button>
    </div>
  );
}

// ✅ GOOD: Loading states
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? <span aria-hidden>Loading...</span> : "Submit"}
  {isLoading && <span className="sr-only">Processing your request</span>}
</button>
```

## Next.js Patterns

### Server Components (App Router)

```tsx
// ✅ GOOD: Fetch data in Server Components
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchDashboardData(); // Direct DB/API call, no useEffect

  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <DataTable data={data} />
      </Suspense>
    </div>
  );
}

// ✅ GOOD: Client components only when needed
("use client");
function InteractiveChart({ data }: { data: ChartData }) {
  const [filter, setFilter] = useState("all");
  // Client-side interactivity
}
```

### Error Boundaries

```tsx
// app/error.tsx
"use client";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```
