const { withAppBuildGradle, withFinalizedMod, withGradleProperties } = require('expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

// AGP 9.2.1 requires Gradle 9.4.1. Keep compatibility with native modules
// that still apply org.jetbrains.kotlin.android and use the legacy Android DSL.
module.exports = function withAndroidBuildCompatibility(config) {
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /getDefaultProguardFile\((['"])proguard-android\.txt\1\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    );
    const codegenOrder = readFileSync(join(__dirname, 'android-codegen.gradle'), 'utf8');
    config.modResults.contents = config.modResults.contents.replace(
      /\n?\/\/ BEGIN native-codegen-order[\s\S]*?\/\/ END native-codegen-order\n?/g,
      '',
    );
    config.modResults.contents += `\n${codegenOrder}\n`;
    return config;
  });

  config = withGradleProperties(config, (config) => {
    for (const key of ['android.builtInKotlin', 'android.newDsl']) {
      config.modResults = config.modResults.filter(
        (entry) => entry.type !== 'property' || entry.key !== key,
      );
      config.modResults.push({ type: 'property', key, value: 'false' });
    }
    return config;
  });

  return withFinalizedMod(config, [
    'android',
    (config) => {
      const path = join(config.modRequest.platformProjectRoot, 'gradle/wrapper/gradle-wrapper.properties');
      const contents = readFileSync(path, 'utf8');
      if (!/^distributionUrl=.*$/m.test(contents)) {
        throw new Error('withAndroidBuildCompatibility: Gradle distributionUrl is missing');
      }
      writeFileSync(
        path,
        contents.replace(
          /^distributionUrl=.*$/m,
          'distributionUrl=https\\://services.gradle.org/distributions/gradle-9.4.1-bin.zip',
        ),
      );
      return config;
    },
  ]);
};
