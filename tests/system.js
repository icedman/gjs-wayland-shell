import GLib from 'gi://GLib';

Object.keys(GLib).forEach((k) => {
  console.log(k);
});

const prettyName = GLib.get_os_info('PRETTY_NAME');
const name = prettyName ? prettyName : GLib.get_os_info('NAME');

console.log(name);

// get_application_name
// get_charset
// get_codeset
// get_console_charset
// get_current_dir
// get_current_time
// get_environ
// get_filename_charsets
// get_home_dir
// get_host_name
// get_language_names
// get_language_names_with_category
// get_locale_variants
// get_monotonic_time
// get_num_processors
// get_os_info
// get_prgname
// get_real_name
// get_real_time
// get_system_config_dirs
// get_system_data_dirs
// get_tmp_dir
// get_user_cache_dir
// get_user_config_dir
// get_user_data_dir
// get_user_name
// get_user_runtime_dir
// get_user_special_dir
// get_user_state_dir
