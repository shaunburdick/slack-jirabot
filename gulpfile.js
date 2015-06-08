var gulp = require('gulp');
var ts = require('gulp-typescript');

gulp.task('default', ['build', 'watch']);

gulp.task('build', function() {
  var tsResult = gulp.src('src/**/*.ts')
    .pipe(ts({
      // noImplicitAny: true,
      // noEmitOnError: true,
      target: 'ES5',
      module: 'commonjs'
    }));

  return tsResult.js.pipe(gulp.dest('release/js'));
});