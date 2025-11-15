package eticaret.demo.payment;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import eticaret.demo.response.ResponseMessage;

public interface PaymentService {

    ResponseMessage complete3DPayment(String paymentId, String conversationId, HttpServletRequest httpServletRequest);

    ResponseMessage paymentAsGuest(@Valid PaymentRequest paymentRequest, HttpServletRequest httpRequest);

    ResponseMessage refundPayment(@Valid RefundRequest refundRequest, HttpServletRequest httpServletRequest);
}