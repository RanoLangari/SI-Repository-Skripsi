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
}

export default Helper;
