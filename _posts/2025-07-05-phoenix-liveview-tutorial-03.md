---
layout: default
title:  "Creating Live Components in Phoenix LiveView"
date:   2025-07-05 22:20:00 +0530
categories: [elixir, phoenix, liveview]
excerpt: "Live component introduction"
---

# Live components introduction and usage 

Phoenix LiveView provides a powerful way to build interactive, real-time applications. A key feature for creating reusable and maintainable UIs is the LiveComponent. In this tutorial, we'll explore how to create and use LiveComponents, starting with a basic example and progressively building up to an in-place editable label.

## 3.1 Creating a Basic Live Component

First, let's set up a LiveView to host our component. We'll create a simple "scratchpad" page for this purpose. Add the following route to your `router.ex`:

```elixir
live "/scratchpad", Scratchpad
```

Next, create the `Scratchpad` LiveView module:

```elixir
defmodule TodoWeb.Scratchpad do
  use TodoWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div>
      Some random string
    </div>
    """
  end
end
```

Now, let's create our first LiveComponent in the same file. This component will be a simple, non-interactive label for now.

```elixir
defmodule TodoWeb.Scratchpad.EditableLabel do
  use Phoenix.LiveComponent

  def mount(socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div> My Live Component </div>
    """
  end
end
```

To use this component in our `Scratchpad` LiveView, we use the `<.live_component>` function in the `render` function:

```diff
  def render(assigns) do
    ~H"""
    <div>
      Some random string
+     <.live_component module={TodoWeb.Scratchpad.EditableLabel}
+       id="scratchpad"/>
    </div>
    """
  end
```

## 3.2 Passing Data to and from a Live Component

LiveComponents can receive data from their parent LiveView and send events back up. Let's modify our example to demonstrate this. We'll have the parent LiveView track a click count and pass it to the component.

Here are the changes for the `Scratchpad` LiveView:

```diff
defmodule TodoWeb.Scratchpad do
    use TodoWeb, :live_view

    def mount(_params, _session, socket) do
      IO.puts("mount called")
-      {:ok, socket}
+      {:ok, socket
+        |> assign(:clicks, 0)
+      }
    end

+   def handle_info(:click, socket) do
+     {:noreply, update(socket, :clicks, &(&1 + 1))}
+   end

    def render(assigns) do
      ~H"""
      <.live_component
        module={TodoWeb.Scratchpad.EditableLabel}
        id="scratchpad"
+       click_count={@clicks}
         />
      """
    end

end
```

And here are the changes for the `EditableLabel` LiveComponent:

```diff
defmodule TodoWeb.Scratchpad.EditableLabel do
  use Phoenix.LiveComponent

  def mount(socket) do
    {:ok, socket}
  end

+ def handle_event(event, params, socket) do
+   case event do
+     "click" ->
+       send(self(), :click)
+       {:noreply, assign(socket, :editable, true)}
+     _ ->
+       IO.puts("Unknown event: #{event}")
+       IO.inspect(params, label: "Params in handle_event")
+       {:noreply, socket}
+   end

  end


  def render(assigns) do
    ~H"""
    <div>
+     <div>Click counts: {@click_count}</div>
+     <button phx-click="click" phx-target={@myself}
+     class="bg-blue-300 p-2 rounded-md hover:bg-blue-400">Click Me</button>
    </div>
    """
  end
end
```

The button in the LiveComponent sends a "click" event to itself (`phx-target={@myself}`). The component's `handle_event` function catches this, sends a `:click` message to its parent LiveView (since they share the same process), and the LiveView's `handle_info` function increments the click count. This updated count is then passed back down to the component, causing it to re-render.

## 3.3 In-Place Editable Label

Now, let's build our final feature: an in-place editable label. We want a label that turns into a text input on a double-click. When the user clicks away, the new value is saved.

First, let's update the `Scratchpad` LiveView to manage the data:

```diff
defmodule TodoWeb.Scratchpad do
    use TodoWeb, :live_view

    def mount(_params, _session, socket) do
      IO.puts("mount called")
      {:ok, socket
-        |> assign(:clicks, 0)
+        |> assign(:data, "Sample text")
      }
    end

-    def handle_info(:click, socket) do
-      {:noreply, update(socket, :clicks, &(&1 + 1))}
+    def handle_info({:save, text}, socket) do
+      {:noreply, assign(socket, :data, text)}
    end

    def render(assigns) do
      ~H"""
      <.live_component
        module={TodoWeb.Scratchpad.EditableLabel}
        id="scratchpad"
-        click_count={@clicks}
+        text={@data}
         />
      """
    end

end
```

Next, we'll update the `EditableLabel` LiveComponent to handle its own state and events:

```diff
defmodule TodoWeb.Scratchpad.EditableLabel do
  use Phoenix.LiveComponent

  def mount(socket) do
-    {:ok, socket}
+    {:ok, socket
+      |> assign(:editable, false)
+    }
  end

  def handle_event(event, params, socket) do
    case event do
-      "click" ->
-        send(self(), :click)
-        {:noreply, assign(socket, :editable, true)}
+      "double_clicked" ->
+        {:noreply, assign(socket, :editable, true)}
+
+      "save" ->
+        %{"value" => text} = params
+        send(self(), {:save, text})
+        {:noreply, assign(socket, :editable, false)}

      _ ->
        IO.puts("Unknown event: #{event}")
        IO.inspect(params, label: "Params in handle_event")
        {:noreply, socket}
    end

  end

  def render(assigns) do
    ~H"""
-    <div>
-      <div>Click counts: {@click_count}</div>
-      <button phx-click="click" phx-target={@myself}
-      class="bg-blue-300 p-2 rounded-md hover:bg-blue-400">Click Me</button>
-    </div>
+    <div id="editable1" phx-hook="DoubleClick" class="editable-label" phx-target={@myself}>    
+      <%= if @editable do %>
+        <input id="input1" type="text" value={@text}  class="editable-input" phx-blur="save" phx-target={@myself} />
+      <% else %>
+        <span id="label1" class="editable-text" phx-click="edit" phx-target={@myself}>
+          {@text}
+        </span>
+      <% end %>
+    </div>
    """
  end
end
```

Here's a breakdown of the changes:

*   **LiveView:** The parent now holds the `data` for the label and handles a `:save` message to update it.
*   **LiveComponent:**
    *   It now has an internal state, `:editable`, to track whether it should be a label or an input field.
    *   A `phx-hook="DoubleClick"` (which requires a corresponding JavaScript hook) is used to send a "double_clicked" event.
    *   The `render` function conditionally renders either a `<span>` (the label) or an `<input>` (the editor) based on the `@editable` assign.
    *   The `phx-blur="save"` attribute on the input field sends a "save" event when the input loses focus.
    *   The "save" event handler sends the new text up to the parent LiveView.

With these changes, we have a reusable, in-place editable label component, demonstrating the power and flexibility of Phoenix LiveComponents.