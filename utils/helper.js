class Helper {
  response(res, status, message, data) {
    return res.status(status).send({
      message,
      data,
    });
  }
  responseError(res, status, message) {
    return res.status(status).send({
      message,
    });
  }
  responseSuccess(res, status, message) {
    return res.status(status).send({
      message,
    });
  }
  capitalizeFirstLetter(string) {
    return string
      .toLowerCase()
      .split(" ")
      .map((word) => {
        return word.toLowerCase().charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
}

export default Helper;
