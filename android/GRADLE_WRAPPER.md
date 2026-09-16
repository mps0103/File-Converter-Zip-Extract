# Gradle wrapper

`gradle-wrapper.jar`, `gradlew` and `gradlew.bat` are binaries and are not included here.
Generate them once, inside this `android` folder, with a Gradle install on your machine:

    cd android && gradle wrapper --gradle-version 8.10.2

Or copy `gradlew`, `gradlew.bat` and `gradle/wrapper/gradle-wrapper.jar` from any other
React Native 0.76 project, such as PdfToolsApp. `gradle-wrapper.properties` is already set
to the matching version.
