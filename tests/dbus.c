#include <gio/gio.h>
#include <stdio.h>

#define SERVICE_NAME "com.example.MyService"
#define OBJECT_PATH "/com/example/MyService"
#define INTERFACE_NAME "com.example.MyInterface"

// static gboolean handle_hello_world(GDBusMethodInvocation *invocation, gpointer user_data) {
//     const char *response = "Hello, world!";
//     g_dbus_method_invocation_return_value(invocation, g_variant_new("(s)", response));
//     return TRUE;
// }

// static const GDBusInterfaceVTable interface_vtable = {
//     .method_call = NULL,
//     .get_property = NULL,
//     .set_property = NULL,
// };

// Property storage
static gchar *property_message = NULL;
static gint property_count = 0;

// Method handler
static void handle_method_call(GDBusConnection *connection, const gchar *sender, const gchar *object_path,
                               const gchar *interface_name, const gchar *method_name, GVariant *parameters,
                               GDBusMethodInvocation *invocation, gpointer user_data) {
    if (g_strcmp0(method_name, "HelloWorld") == 0) {
        const char *response = "Hello from D-Bus!";
        g_print("HelloWorld method called by %s\n", sender);
        g_dbus_method_invocation_return_value(invocation, g_variant_new("(s)", response));
    } else {
        g_dbus_method_invocation_return_error(invocation, G_DBUS_ERROR, G_DBUS_ERROR_UNKNOWN_METHOD,
                                              "Unknown method: %s", method_name);
    }
}

// Property handlers
static GVariant *get_property(GDBusConnection *connection, const gchar *sender, const gchar *object_path,
                               const gchar *interface_name, const gchar *property_name, GError **error, gpointer user_data) {
    if (g_strcmp0(property_name, "Message") == 0) {
        return g_variant_new_string(property_message ? property_message : "Default Message");
    } else if (g_strcmp0(property_name, "Count") == 0) {
        return g_variant_new_int32(property_count);
    }
    return NULL; // Property not found
}

static gboolean set_property(GDBusConnection *connection, const gchar *sender, const gchar *object_path,
                              const gchar *interface_name, const gchar *property_name, GVariant *value, GError **error, gpointer user_data) {
    if (g_strcmp0(property_name, "Message") == 0) {
        g_free(property_message);
        property_message = g_strdup(g_variant_get_string(value, NULL));
        return TRUE;
    }
    g_set_error(error, G_DBUS_ERROR, G_DBUS_ERROR_PROPERTY_READ_ONLY, "The 'Count' property is read-only.");
    return FALSE;
}

// VTable
static const GDBusInterfaceVTable interface_vtable = {
    .method_call = handle_method_call,
    .get_property = get_property,
    .set_property = set_property,
};


static GDBusNodeInfo *introspection_data = NULL;

const gchar *introspection_xml =
    "<node>"
    "  <interface name='com.example.MyInterface'>"
    "    <method name='HelloWorld'>"
    "      <arg type='s' name='response' direction='out'/>"
    "    </method>"
    "    <property name='Message' type='s' access='readwrite'/>"
    "    <property name='Count' type='i' access='read'/>"
    "  </interface>"
    "</node>";

static void on_bus_acquired(GDBusConnection *connection, const gchar *name, gpointer user_data) {
    GError *error = NULL;

    // Register the object
    guint registration_id = g_dbus_connection_register_object(
        connection,
        OBJECT_PATH,
        introspection_data->interfaces[0],
        &interface_vtable,
        NULL, // user data
        NULL, // user data free function
        &error);

    if (registration_id == 0) {
        g_printerr("Failed to register object: %s\n", error->message);
        g_error_free(error);
    }
}

static void on_name_acquired(GDBusConnection *connection, const gchar *name, gpointer user_data) {
    g_print("Service name '%s' acquired.\n", SERVICE_NAME);
}

static void on_name_lost(GDBusConnection *connection, const gchar *name, gpointer user_data) {
    g_print("Service name '%s' lost.\n", SERVICE_NAME);
}

int main(int argc, char *argv[]) {
    GMainLoop *loop;
    guint owner_id;

    // Create introspection data
    introspection_data = g_dbus_node_info_new_for_xml(introspection_xml, NULL);

    // Acquire the bus name
    owner_id = g_bus_own_name(
        G_BUS_TYPE_SESSION,
        SERVICE_NAME,
        G_BUS_NAME_OWNER_FLAGS_NONE,
        on_bus_acquired,
        on_name_acquired,
        on_name_lost,
        NULL,
        NULL);

    // Run the main loop
    loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);

    // Cleanup
    g_bus_unown_name(owner_id);
    g_dbus_node_info_unref(introspection_data);
    g_main_loop_unref(loop);

    return 0;
}
